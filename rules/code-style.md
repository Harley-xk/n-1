# AI 工作规则 —— 代码风格

> 优先级仅次于 [base.md](base.md)。本规则由 ESLint（`@stylistic` + `eslint-plugin-import-x`）自动强制，检查与自动修复命令：`pnpm lint`。

## 1. 通用格式（前后端一致）

1. **结尾无分号**
2. **字符串使用单引号**；需要插值时用模板字符串；字符串本身含单引号时可用双引号避免转义
3. **缩进 2 空格**，禁止 Tab
4. **尾逗号**：多行结构的最后一项保留逗号，单行结构不留
5. **单行长度建议 ≤ 100 字符**（不强校验，超长时优先拆分变量或换行）
6. 换行符统一 LF（由仓库 `.gitattributes` 保证，代码内无需关心）

## 2. import 导入排序（`import-x/order` 强制）

分组顺序、组间空行、组内按路径字母序（不区分大小写）：

```ts
// 1. 副作用导入（如 import 'reflect-metadata'）
// 2. 第三方包（@nestjs/*、vue、axios …）
// 3. 本地模块（@/xxx、./xxx、../xxx）
```

## 3. 命名规范

| 对象 | 风格 | 示例 |
| --- | --- | --- |
| 变量、函数、参数 | camelCase | `userService`、`getHealth()` |
| 类、接口、类型、Vue 组件 | PascalCase | `AppService`、`HomeView` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 后端文件 | kebab-case（Nest 惯例随类名） | `app.service.ts` |
| 前端 Vue 组件文件 | PascalCase | `HomeView.vue` |
| 前端非组件 ts 文件 | kebab-case | `http.ts`、`counter.ts` |

## 4. 后端日志（server/）

**必须使用 NestJS 内置 `Logger`，禁止 `console.*`**（ESLint `no-console: error` 强制）：

```ts
import { Logger } from '@nestjs/common'

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name)

  findAll() {
    this.logger.log('查询全部数据')
    this.logger.warn('缓存未命中')
    this.logger.error('查询失败', error.stack)
  }
}
```

约定：

- 每个类持有自己的 `Logger` 实例，上下文传**类名**，便于按模块过滤日志
- 入口/引导过程（如 `main.ts`）用 `new Logger('Bootstrap')`
- `logger.error` 尽量携带错误堆栈（第二参数）

## 5. 前端日志与组件（web/）

- 开发期允许 `console.warn` / `console.error`；业务调试信息应封装到工具函数，禁止在组件中散落 `console.log`
- Vue 组件一律使用 `<script setup lang="ts">` 组合式 API
- 组件内状态优先局部 `ref`/`reactive`，跨组件共享才进 Pinia store
- 模板中 HTML 属性保持双引号（HTML 惯例，与 JS 字符串单引号规则互不影响）
