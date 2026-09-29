import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'

import { buildMenuTree } from '@/utils/menu'


describe('路由树转菜单树', () => {
  it('嵌套路由递归生成菜单，meta 透传标题与图标', () => {
    const routes = [
      {
        path: 'home',
        meta: { title: '首页', icon: 'home' },
      },
      {
        path: 'demo',
        meta: { title: '开发示例', icon: 'demo' },
        children: [
          {
            path: 'product',
            meta: { title: '商品管理', icon: 'product' },
          },
        ],
      },
    ] as unknown as RouteRecordRaw[]

    const tree = buildMenuTree(routes)

    expect(tree).toHaveLength(2)
    expect(tree[0]).toMatchObject({ path: '/home', title: '首页', icon: 'home' })
    expect(tree[1].children).toHaveLength(1)
    expect(tree[1].children[0].path).toBe('/demo/product')
  })

  it('hidden 路由不进菜单（刷新中转等隐藏子页）', () => {
    const routes = [
      { path: 'home', meta: { title: '首页' } },
      { path: 'redirect/:path(.*)*', meta: { title: '刷新中', hidden: true } },
    ] as unknown as RouteRecordRaw[]

    const tree = buildMenuTree(routes)

    expect(tree).toHaveLength(1)
    expect(tree[0].path).toBe('/home')
  })

  it('顶级绝对路径直接使用，不重复拼接', () => {
    const routes = [{ path: '/absolute', meta: { title: '绝对' } }] as unknown as RouteRecordRaw[]

    expect(buildMenuTree(routes)[0].path).toBe('/absolute')
  })

  it('title 缺失兜底「未命名」', () => {
    const routes = [{ path: 'x' }] as unknown as RouteRecordRaw[]

    expect(buildMenuTree(routes)[0].title).toBe('未命名')
  })
})

describe('菜单权限过滤', () => {
  const routes = [
    { path: 'home', meta: { title: '首页' } },
    {
      path: 'system',
      meta: { title: '系统管理', icon: 'system', permission: 'system:user:query' },
      children: [
        { path: 'user', meta: { title: '用户管理' } },
        { path: 'role', meta: { title: '角色管理', permission: 'system:role:query' } },
      ],
    },
    { path: 'demo', meta: { title: '开发示例' } },
  ] as unknown as RouteRecordRaw[]

  it('无权限要求的节点保留；有权限要求且无权的节点整棵剔除', () => {
    // 判定语义与 store.hasPermission 一致：无要求放行、有要求全拒（空权限集用户）
    const denyAll = (permission?: string) => permission === undefined
    const tree = buildMenuTree(routes, '/', denyAll)

    expect(tree.map(node => node.path)).toEqual(['/home', '/demo'])
  })

  it('子级权限不足时仅剔除该子级（父级有要求且通过则保留）', () => {
    // 持有 user:query：system 目录（挂 user 查询）保留，子级 role（挂 role 查询）剔除
    const grantUserQuery = (permission?: string) =>
      permission === undefined || permission === 'system:user:query'
    const tree = buildMenuTree(routes, '/', grantUserQuery)

    const system = tree.find(node => node.path === '/system')
    expect(system).toBeDefined()
    expect(system!.children.map(node => node.path)).toEqual(['/system/user'])
  })

  it('持有目录权限时子树完整保留', () => {
    const tree = buildMenuTree(routes, '/', () => true)

    expect(tree).toHaveLength(3)
    expect(tree[1].children).toHaveLength(2)
  })

  it('不传判定函数时不过滤（向后兼容）', () => {
    const tree = buildMenuTree(routes)

    expect(tree).toHaveLength(3)
  })

  it('子级全被权限过滤后空分组应一并剔除（父级无权限要求的场景）', () => {
    // 实际路由形态：system 父级不挂 permission，八个子页各挂 query 权限；
    // 无任何 system 权限的用户不应看到空的「系统管理」分组
    const routesWithChildPermissions = [
      { path: 'home', meta: { title: '首页' } },
      {
        path: 'system',
        meta: { title: '系统管理', icon: 'system' },
        children: [
          { path: 'user', meta: { title: '用户管理', permission: 'system:user:query' } },
          { path: 'role', meta: { title: '角色管理', permission: 'system:role:query' } },
        ],
      },
    ] as unknown as RouteRecordRaw[]
    const denyAll = (permission?: string) => permission === undefined

    const tree = buildMenuTree(routesWithChildPermissions, '/', denyAll)

    expect(tree.map(node => node.path)).toEqual(['/home'])
  })
})
