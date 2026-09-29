import { beforeEach, describe, expect, it } from 'vitest'

import { applyColumnState, loadColumnState, saveColumnState } from './column-persist'

/** localStorage 是 jsdom 全局，直接操作以 Arrange */
beforeEach(() => {
  localStorage.clear()
})

describe('loadColumnState', () => {
  it('无记录时返回 null', () => {
    expect(loadColumnState('SystemUser')).toBeNull()
  })

  it('损坏 JSON 时返回 null 并顺带清除脏数据', () => {
    localStorage.setItem('N1_TABLE_COLS', '{oops')
    expect(loadColumnState('SystemUser')).toBeNull()
    expect(localStorage.getItem('N1_TABLE_COLS')).toBeNull()
  })

  it('widths 缺失时按空对象兜底', () => {
    localStorage.setItem('N1_TABLE_COLS', JSON.stringify({ SystemUser: { order: ['a'] } }))
    expect(loadColumnState('SystemUser')).toEqual({ order: ['a'], widths: {} })
  })

  it('order 非数组时视为无效记录返回 null', () => {
    localStorage.setItem('N1_TABLE_COLS', JSON.stringify({ SystemUser: { widths: { a: 100 } } }))
    expect(loadColumnState('SystemUser')).toBeNull()
  })
})

describe('saveColumnState', () => {
  it('保存列顺序与拖拽过的列宽', () => {
    saveColumnState('SystemUser', [
      { field: 'username', resizeWidth: 180 },
      { field: 'status' },
      { field: 'action', resizeWidth: 260.4 },
    ])
    expect(loadColumnState('SystemUser')).toEqual({
      order: ['username', 'status', 'action'],
      widths: { username: 180, action: 260 },
    })
  })

  it('无 field 列跳过、非法宽度（0 / 负数 / 非数字）不记宽', () => {
    saveColumnState('SystemUser', [
      { resizeWidth: 100 },
      { field: 'a', resizeWidth: 0 },
      { field: 'b', resizeWidth: -5 },
      { field: 'c', resizeWidth: NaN },
      { field: 'd' },
    ])
    expect(loadColumnState('SystemUser')).toEqual({ order: ['a', 'b', 'c', 'd'], widths: {} })
  })

  it('多视图 key 互不干扰', () => {
    saveColumnState('SystemUser', [{ field: 'a', resizeWidth: 100 }])
    saveColumnState('SystemDict:data', [{ field: 'label', resizeWidth: 200 }])
    expect(loadColumnState('SystemUser')?.widths).toEqual({ a: 100 })
    expect(loadColumnState('SystemDict:data')?.widths).toEqual({ label: 200 })
  })

  it('拖列序（无 resizeWidth）不冲掉历史列宽，本次拖宽覆盖旧值', () => {
    saveColumnState('SystemUser', [
      { field: 'code', resizeWidth: 337 },
      { field: 'name' },
    ])
    // 会话重开后仅拖列序：resizeWidth 全空，历史宽度须保留
    saveColumnState('SystemUser', [{ field: 'name' }, { field: 'code' }])
    expect(loadColumnState('SystemUser')).toEqual({
      order: ['name', 'code'],
      widths: { code: 337 },
    })
    // 再次拖宽同一列：新值覆盖旧值
    saveColumnState('SystemUser', [{ field: 'name' }, { field: 'code', resizeWidth: 400 }])
    expect(loadColumnState('SystemUser')?.widths).toEqual({ code: 400 })
  })

  it('已删除列的历史宽度随下次保存清理', () => {
    saveColumnState('SystemUser', [{ field: 'a', resizeWidth: 100 }, { field: 'b', resizeWidth: 120 }])
    saveColumnState('SystemUser', [{ field: 'a' }])
    expect(loadColumnState('SystemUser')?.widths).toEqual({ a: 100 })
  })

  it('全部列都无 field 时不落盘', () => {
    saveColumnState('SystemUser', [{ resizeWidth: 100 }])
    expect(localStorage.getItem('N1_TABLE_COLS')).toBeNull()
  })
})

describe('applyColumnState', () => {
  const columns = [
    { field: 'a', title: 'A' },
    { field: 'b', title: 'B' },
    { field: 'c', title: 'C' },
  ]

  it('state 为 null 时原样返回', () => {
    expect(applyColumnState(columns, null)).toBe(columns)
  })

  it('按存储顺序重排，宽度记录覆盖为固定像素宽', () => {
    const result = applyColumnState(columns, { order: ['c', 'a', 'b'], widths: { a: 180 } })
    expect(result.map(col => col.field)).toEqual(['c', 'a', 'b'])
    expect(result[1]).toMatchObject({ field: 'a', width: 180 })
    // 未记宽的列保持原定义（不出现 width 键）
    expect(result[0]).not.toHaveProperty('width')
    expect(result[2]).not.toHaveProperty('width')
  })

  it('存储中的已删列字段被忽略', () => {
    const result = applyColumnState(columns, { order: ['gone', 'b', 'a', 'c'], widths: {} })
    expect(result.map(col => col.field)).toEqual(['b', 'a', 'c'])
  })

  it('代码新增列按原相对顺序追加尾部', () => {
    const withNew = [...columns, { field: 'new' as const, title: 'N' }, { field: 'new2' as const, title: 'N2' }]
    const result = applyColumnState(withNew, { order: ['b', 'c', 'a'], widths: {} })
    expect(result.map(col => col.field)).toEqual(['b', 'c', 'a', 'new', 'new2'])
  })

  it('非法存储宽度（非正数）不覆盖', () => {
    const result = applyColumnState(columns, { order: ['a', 'b', 'c'], widths: { a: -1, b: 0 } })
    expect(result[0]).not.toHaveProperty('width')
    expect(result[1]).not.toHaveProperty('width')
  })

  it('空列定义原样返回', () => {
    expect(applyColumnState([], { order: ['a'], widths: { a: 1 } })).toEqual([])
  })
})
