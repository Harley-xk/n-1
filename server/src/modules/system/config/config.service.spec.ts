import { describe, expect, it } from '@jest/globals'

import type { ConfigEntity } from '../entities/config.entity'
import { SystemErrorCode } from '../error-codes'
import { SystemConfigService } from './config.service'

type ConfigRow = Partial<ConfigEntity> & { configKey: string }

/** 行匹配 where 等值条件（含 Not 操作符：唯一性校验排除自身用） */
function matches(row: unknown, where: Record<string, unknown> | undefined): boolean {
  if (!where)
    return true
  const record = row as Record<string, unknown>
  return Object.entries(where).every(([key, value]) => {
    if (value !== null && typeof value === 'object' && 'type' in (value as Record<string, unknown>)) {
      const operator = value as { type: string, value: unknown }
      if (operator.type === 'not')
        return record[key] !== operator.value
    }
    return record[key] === value
  })
}

function makeService(options: { configs?: ConfigRow[] } = {}) {
  const configs: ConfigRow[] = (options.configs ?? []).map(row => ({ ...row }))
  const configRepository = {
    findOne: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(configs.find(config => matches(config, where)) ?? null),
    save: (entity: ConfigEntity) => Promise.resolve(entity),
    create: (data: Partial<ConfigEntity>) => Object.assign({ visible: true }, data),
    softRemove: (entity: ConfigEntity) => Promise.resolve(entity),
  }
  const service = new SystemConfigService(configRepository as never)
  return { service }
}

describe('SystemConfigService 取值', () => {
  it('按存在的键取值应返回参数值', async () => {
    const { service } = makeService({
      configs: [{ configKey: 'system.user.init-password', configValue: 'table-pass' }],
    })
    await expect(service.getValueByKey('system.user.init-password')).resolves.toBe('table-pass')
  })

  it('键未命中应返回 null', async () => {
    const { service } = makeService()
    await expect(service.getValueByKey('ghost.key')).resolves.toBeNull()
  })

  it('键未命中且带兜底值应返回兜底', async () => {
    const { service } = makeService()
    await expect(service.getValueByKey('ghost.key', 'fallback')).resolves.toBe('fallback')
  })

  it('值为空白应视为未命中（空串非有效参数契约）', async () => {
    const { service } = makeService({ configs: [{ configKey: 'blank.key', configValue: '   ' }] })
    await expect(service.getValueByKey('blank.key')).resolves.toBeNull()
    await expect(service.getValueByKey('blank.key', 'fallback')).resolves.toBe('fallback')
  })
})

describe('SystemConfigService CRUD', () => {
  const INIT_PASSWORD: ConfigRow = { configKey: 'system.user.init-password', configValue: 'admin123' }

  it('创建时键已存在应抛 CONFIG_KEY_DUPLICATE', async () => {
    const { service } = makeService({ configs: [INIT_PASSWORD] })
    await expect(
      service.create({ category: 'system', name: '初始口令', configKey: 'system.user.init-password', configValue: 'x' }),
    ).rejects.toMatchObject({ code: SystemErrorCode.CONFIG_KEY_DUPLICATE.code })
  })

  it('更新自身保留原键不应误判重复', async () => {
    const { service } = makeService({
      configs: [{ id: 'c1', ...INIT_PASSWORD }],
    })
    await expect(
      service.update({ id: 'c1', category: 'system', name: '初始口令', configKey: 'system.user.init-password', configValue: 'new-pass' }),
    ).resolves.toBeUndefined()
  })

  it('参数不存在应抛 CONFIG_NOT_EXISTS', async () => {
    const { service } = makeService()
    await expect(service.remove('ghost')).rejects.toMatchObject({
      code: SystemErrorCode.CONFIG_NOT_EXISTS.code,
    })
  })
})
