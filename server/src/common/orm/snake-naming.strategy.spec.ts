import { describe, expect, it } from '@jest/globals'

import { snakeCase, SnakeNamingStrategy } from './snake-naming.strategy'

describe('snakeCase 转换', () => {
  it('应将普通驼峰转为蛇形小写', () => {
    expect(snakeCase('createTime')).toBe('create_time')
  })

  it('应以数字为边界拆分', () => {
    expect(snakeCase('roleId')).toBe('role_id')
    expect(snakeCase('user2Name')).toBe('user2_name')
  })

  it('应处理连续大写缩写', () => {
    expect(snakeCase('myURL')).toBe('my_url')
    expect(snakeCase('HTTPServer')).toBe('http_server')
  })

  it('应保持已是蛇形的值不变', () => {
    expect(snakeCase('deleted_at')).toBe('deleted_at')
  })
})

describe('SnakeNamingStrategy 蛇形命名策略', () => {
  const strategy = new SnakeNamingStrategy()

  it('表名默认取类名蛇形，显式名优先', () => {
    expect(strategy.tableName('SystemUser')).toBe('system_user')
    expect(strategy.tableName('SystemUser', 'system_users')).toBe('system_users')
  })

  it('列名蛇形且嵌入前缀以下划线拼接', () => {
    expect(strategy.columnName('createTime')).toBe('create_time')
    expect(strategy.columnName('address', 'detail', ['home'])).toBe('home_detail')
  })

  it('关联列名为「关系名_引用列」蛇形拼接', () => {
    expect(strategy.joinColumnName('role', 'id')).toBe('role_id')
  })

  it('连接表名为「表_表_属性」蛇形拼接', () => {
    expect(strategy.joinTableName('system_user', 'system_role', 'roles')).toBe(
      'system_user_system_role_roles',
    )
  })
})
