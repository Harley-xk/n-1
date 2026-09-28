import { describe, expect, it } from '@jest/globals'

import { AsyncTaskQueue } from './async-task-queue'

/** 手动放行的闸门任务：release 之前保持「执行中」，用于占住并发槽 */
function createGateTask() {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  return {
    task: async () => {
      await gate
    },
    release,
  }
}

/** 冲刷微任务队列（setTimeout 0 在全部微任务之后执行，可稳定观察到「已开始」的任务） */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/** 同步立即完成的占位任务（填队列 / 记号用） */
function noopTask(): Promise<void> {
  return Promise.resolve()
}

describe('AsyncTaskQueue', () => {
  it('任务应按提交顺序（FIFO）执行', async () => {
    const queue = new AsyncTaskQueue()
    const order: number[] = []
    const gate = createGateTask()
    for (let i = 0; i < 10; i++) {
      queue.submit(async () => {
        order.push(i)
        await gate.task()
      })
    }
    // 并发上限 4：放行前只应有前 4 个开始
    await flushMicrotasks()
    expect(order).toEqual([0, 1, 2, 3])
    gate.release()
    await queue.drain()
    expect(order).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('队列满后提交的任务应不排队当场执行（CallerRuns 降级语义）', async () => {
    const queue = new AsyncTaskQueue()
    const gate = createGateTask()
    // 4 个闸门任务占满并发槽 + 200 个任务填满队列
    for (let i = 0; i < 4; i++)
      queue.submit(gate.task)
    for (let i = 0; i < 200; i++)
      queue.submit(noopTask)
    // 队满后的第 205 个任务：不等闸门放行即开始执行
    let overflowStarted = false
    queue.submit(() => {
      overflowStarted = true
      return Promise.resolve()
    })
    await flushMicrotasks()
    expect(overflowStarted).toBe(true)
    gate.release()
    await queue.drain()
  })

  it('任务异常应仅告警且不中断后续调度、drain 不因此 reject', async () => {
    const queue = new AsyncTaskQueue()
    const done: number[] = []
    queue.submit(() => Promise.reject(new Error('入库连接失败')))
    queue.submit(() => {
      done.push(1)
      return Promise.resolve()
    })
    await expect(queue.drain()).resolves.toBeUndefined()
    expect(done).toEqual([1])
  })

  it('空队列 drain 应立即完成', async () => {
    const queue = new AsyncTaskQueue()
    await expect(queue.drain()).resolves.toBeUndefined()
  })

  it('drain 超时应放弃等待而非永久悬挂', async () => {
    const queue = new AsyncTaskQueue()
    const gate = createGateTask()
    queue.submit(gate.task)
    await expect(queue.drain(10)).resolves.toBeUndefined()
    gate.release()
    await queue.drain()
  })

  it('关停后新任务应被丢弃、存量任务应被排空', async () => {
    const queue = new AsyncTaskQueue()
    const gate = createGateTask()
    const done: number[] = []
    queue.submit(async () => {
      await gate.task()
      done.push(1)
    })
    // 触发优雅关停：同步置关停标记后排空存量
    const shutdownPromise = queue.onApplicationShutdown()
    let droppedExecuted = false
    queue.submit(() => {
      droppedExecuted = true
      return Promise.resolve()
    })
    gate.release()
    await shutdownPromise
    expect(done).toEqual([1])
    await flushMicrotasks()
    expect(droppedExecuted).toBe(false)
  })
})
