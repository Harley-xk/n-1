import { describe, expect, it } from 'vitest'

import { groupPermissions } from '@/utils/permission'

describe('权限点分组', () => {
  it('应按权限串第二段分域并翻译中文名', () => {
    const groups = groupPermissions([
      { code: 'system:user:query', label: '用户查询' },
      { code: 'system:user:create', label: '用户新增' },
      { code: 'system:dict:query', label: '字典查询' },
    ])

    expect(groups.map(group => group.domain)).toEqual(['user', 'dict'])
    expect(groups[0]).toMatchObject({ domain: 'user', label: '用户管理' })
    expect(groups[0].points).toHaveLength(2)
    expect(groups[1].points[0].label).toBe('字典查询')
  })

  it('未登记的域应原样展示域标识（新域接入不炸）', () => {
    const groups = groupPermissions([{ code: 'system:notice:query', label: '公告查询' }])

    expect(groups[0].label).toBe('notice')
  })

  it('非标准形态的权限串应整体归入一组（防御性兜底）', () => {
    const groups = groupPermissions([{ code: 'legacy-permission', label: '遗留权限' }])

    expect(groups).toHaveLength(1)
    expect(groups[0].domain).toBe('legacy-permission')
  })

  it('空集应返回空数组', () => {
    expect(groupPermissions([])).toEqual([])
  })
})
