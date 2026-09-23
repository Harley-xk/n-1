import { describe, expect, it } from '@jest/globals'

import { serializeDates } from './serialize-dates'

describe('serializeDates', () => {
  it('应转换顶层与嵌套对象中的 Date 为毫秒时间戳', () => {
    const createdAt = new Date('2026-09-10T08:30:00.000Z')
    const input = {
      id: 1,
      createdAt,
      nested: { updatedAt: createdAt, flag: true },
    }

    const result = serializeDates(input)

    expect(result.createdAt).toBe(createdAt.getTime())
    expect(result.nested.updatedAt).toBe(createdAt.getTime())
    expect(result.nested.flag).toBe(true)
  })

  it('应转换数组中的 Date（含嵌套结构）', () => {
    const date = new Date('2026-01-01T00:00:00.000Z')
    const input = { dates: [date, date], objects: [{ at: date }], matrix: [['flat', date]] }

    const result = serializeDates(input)

    expect(result.dates[1]).toBe(date.getTime())
    expect(result.objects[0].at).toBe(date.getTime())
    expect(result.matrix[0][1]).toBe(date.getTime())
  })

  it('基本类型与不含 Date 的对象应原样返回', () => {
    expect(serializeDates('2026-09-10')).toBe('2026-09-10')
    expect(serializeDates(42)).toBe(42)
    expect(serializeDates(true)).toBe(true)
    expect(serializeDates(null)).toBeNull()
    expect(serializeDates(undefined)).toBeUndefined()

    const input = { name: 'n-1', version: '0.1.0' }
    expect(serializeDates(input)).toEqual(input)
  })

  it('循环引用对象不应栈溢出', () => {
    const input: Record<string, unknown> = { name: 'a' }
    input.self = input

    const result = serializeDates(input)

    expect(result.name).toBe('a')
    expect(result.self).toBe(input)
  })
})
