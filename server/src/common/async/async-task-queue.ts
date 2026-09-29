/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 异步任务队列：FIFO + 未完成任务数上限的微任务调度器（CallerRuns 反压语义的单线程实现）
 */
import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common'

/** 队列参数：首个消费方只有日志入库（单条 insert 毫秒级），固化为常量；第二个消费方出现时再评估参数化 */
const MAX_CONCURRENCY = 4
const MAX_QUEUE_SIZE = 200
const DRAIN_TIMEOUT_MS = 5000

/**
 * 异步任务队列：日志异步入库等「失败仅告警、不阻塞主流程」场景的统一消费通道。
 *
 * - Node 单线程无线程池概念，「池」翻译为未完成任务数上限（MAX_CONCURRENCY）；
 *   队列满时不拒绝，而是**不排队当场异步执行**——线程池 CallerRuns 反压策略
 *   「队列满退回调用线程执行、天然限流」的语义（用当前请求的响应时间吸收背压，不阻塞事件循环）
 * - 任务闭包必须持有**纯数据**（如组装完的日志实体），不得在任务体内读取 AsyncLocalStorage
 *   请求上下文——队列执行时已脱离请求异步上下文（设计纪律，见批次五设计文档 §3.3）
 */
@Injectable()
export class AsyncTaskQueue implements OnApplicationShutdown {
  private readonly logger = new Logger(AsyncTaskQueue.name)
  private readonly queue: (() => Promise<void>)[] = []
  /** 未完成（执行中）任务数 */
  private activeCount = 0
  /** 已进入关停流程：拒绝新任务 */
  private shutdown = false
  /** drain 的等待者：队列空且无执行中任务时通知 */
  private readonly emptyWaiters: (() => void)[] = []

  /** 提交异步任务：fire-and-forget，**任何情况下不向调用方抛错**（失败仅 warn） */
  submit(task: () => Promise<void>): void {
    if (this.shutdown) {
      this.logger.warn('异步任务队列已关停，任务被丢弃')
      return
    }
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // 队满降级：不排队当场异步执行（CallerRuns 语义翻译）
      this.run(task)
      return
    }
    this.queue.push(task)
    this.schedule()
  }

  /** 排空等待（带超时）：优雅关停与测试共用 */
  drain(timeoutMs: number = DRAIN_TIMEOUT_MS): Promise<void> {
    if (this.activeCount === 0 && this.queue.length === 0)
      return Promise.resolve()
    return new Promise((resolve) => {
      const waiter = () => {
        clearTimeout(timer)
        resolve()
      }
      const timer = setTimeout(() => {
        const index = this.emptyWaiters.indexOf(waiter)
        if (index >= 0)
          this.emptyWaiters.splice(index, 1)
        this.logger.warn(`异步任务队列排空超时（${timeoutMs}ms），放弃等待`)
        resolve()
      }, timeoutMs)
      this.emptyWaiters.push(waiter)
    })
  }

  /** 优雅关停：拒绝新任务并排空存量（app.close() 经 enableShutdownHooks 触发） */
  async onApplicationShutdown(): Promise<void> {
    this.shutdown = true
    await this.drain()
  }

  /** 尽量填满并发槽位（FIFO） */
  private schedule(): void {
    while (this.activeCount < MAX_CONCURRENCY && this.queue.length > 0)
      this.run(this.queue.shift()!)
  }

  private run(task: () => Promise<void>): void {
    this.activeCount++
    void Promise.resolve()
      .then(task)
      .catch((err: unknown) => {
        // 入库失败不影响业务语义，仅告警（DB 故障时逐条 error 会刷屏，取 warn）
        this.logger.warn(`异步任务执行失败：${(err as Error)?.message ?? err}`)
      })
      .finally(() => {
        this.activeCount--
        if (this.queue.length > 0)
          this.schedule()
        else if (this.activeCount === 0)
          this.notifyEmpty()
      })
  }

  private notifyEmpty(): void {
    const waiters = this.emptyWaiters.splice(0)
    waiters.forEach(waiter => waiter())
  }
}
