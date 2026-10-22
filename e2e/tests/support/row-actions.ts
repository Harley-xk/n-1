// 行内操作按钮支撑件：适配 N1Table 操作列按钮动态收纳（RowActions，表格组件设计 §8）。
// 按钮直接可见时原位交互；被收纳时先点「更多操作」展开 popover 再交互——用例无需感知当前
// 收纳态（用户管理 / 通道抽屉的列宽与按钮总宽仅差 1~2px，字体环境微变即翻转收纳）。
// 限于普通行内按钮：el-dropdown 触发器（应用页「更多」）收纳进 popover 后的展开交互
// 未经验证，仍由用例原位点击（应用页 200px 当前三按钮全可见不收纳）
import type { Locator, Page } from '@playwright/test'

/** 收纳 popover 的隐藏按钮列表（全局唯一，teleport 至 body） */
function popList(page: Page): Locator {
  return page.locator('.n1-row-actions-pop__list')
}

/**
 * 定位行内操作按钮（不点击，供 disabled 等状态断言）：
 * 直接可见返回行内定位器；被收纳则先展开「更多操作」返回 popover 内定位器
 */
export async function rowActionButton(page: Page, row: Locator, name: string): Promise<Locator> {
  const direct = row.getByRole('button', { name, exact: true })
  const more = row.getByRole('button', { name: '更多操作' })
  // 先等行渲染定型再判定：目标按钮直见、或被收纳时外壳出「更多操作」，二者必居其一。
  // 不等就判 isVisible 会把「行未渲染」（goto 后表格数据异步加载）误判为「被收纳」
  await direct.or(more).first().waitFor({ state: 'attached' })
  if (await direct.isVisible()) {
    return direct
  }
  await more.click()
  const inPop = popList(page).getByRole('button', { name, exact: true })
  await inPop.waitFor({ state: 'visible' })
  return inPop
}

/** 点击行内操作按钮（收纳感知） */
export async function clickRowAction(page: Page, row: Locator, name: string): Promise<void> {
  await (await rowActionButton(page, row, name)).click()
}
