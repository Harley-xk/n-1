/*
 * 作者: Harley-xk
 * 创建: 2026-09-28
 *
 * 描述: 蛇形命名策略——表 / 列 / 关联名统一蛇形小写不加引号（n-2 标识符规约的 TypeORM 翻译）
 */
import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm'

/** 驼峰 / 大写缩写转蛇形小写：createTime → create_time、roleId → role_id、myURL → my_url */
export function snakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(className: string, customName?: string): string {
    return customName ?? snakeCase(className)
  }

  columnName(propertyName: string, customName?: string, embeddedPrefixes: string[] = []): string {
    const prefix = embeddedPrefixes.map(p => snakeCase(p)).join('_')
    const column = snakeCase(customName ?? propertyName)
    return prefix ? `${prefix}_${column}` : column
  }

  relationName(propertyName: string): string {
    return snakeCase(propertyName)
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`)
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ): string {
    return snakeCase(`${firstTableName}_${secondTableName}_${firstPropertyName}`)
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`)
  }

  eagerJoinRelationAlias(alias: string, aliasPath: string): string {
    return snakeCase(`${alias}_${aliasPath.replace('.', '_')}`)
  }
}
