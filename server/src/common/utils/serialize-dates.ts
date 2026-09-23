/*
 * 作者: Harley-xk
 * 创建: 2026-09-10
 *
 * 描述: 时间序列化工具：将数据中的 Date 实例深度转换为毫秒 Unix 时间戳
 */

/**
 * 深度转换业务数据中的 Date 实例为毫秒 Unix 时间戳（number）。
 *
 * 前后端时间交换契约：时间戳本身无时区语义，规避服务器与客户端时区不一致问题。
 * 刻意不改写 Date.prototype.toJSON（进程级原型污染，会影响日志、Swagger 与第三方库序列化），
 * 显式转换的作用边界精确限定在「HTTP 响应序列化」这一层。
 *
 * 性能：O(N) 单遍递归，与 JSON.stringify 同阶；固定分支顺序、Object.keys 遍历、
 * 数组走原生 map，均为 V8 自适应优化（TurboFan）友好的形态，典型响应为微秒级开销。
 *
 * 类型说明：返回类型维持 T（运行时 Date 已转为 number）——深度条件类型精确建模的
 * 编译成本大于收益，此处为已知且可接受的类型妥协。
 */
export function serializeDates<T>(value: T): T {
  return convert(value, new WeakSet<object>()) as T
}

function convert(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Date)
    return value.getTime()

  if (Array.isArray(value))
    return value.map(item => convert(item, seen))

  if (value !== null && typeof value === 'object') {
    // 循环引用防护：seen 为本次调用新建的局部 WeakSet，随调用栈销毁，无跨请求持有；
    // 弱引用不阻止成员对象被 GC。禁止提升为模块级缓存复用——跨请求残留引用才是真正的泄漏源
    if (seen.has(value))
      return value
    seen.add(value)

    const result: Record<string, unknown> = {}
    for (const key of Object.keys(value))
      result[key] = convert((value as Record<string, unknown>)[key], seen)
    return result
  }

  return value
}
