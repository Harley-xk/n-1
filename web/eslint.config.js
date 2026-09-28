// 前端 ESLint 扁平配置（ESLint 10 + eslint-plugin-vue 10 + typescript-eslint + @stylistic + import-x），风格规则见 rules/code-style.md
import stylistic from '@stylistic/eslint-plugin'
import importX from 'eslint-plugin-import-x'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  ...pluginVue.configs['flat/recommended'],
  ...tseslint.configs.recommended,
  {
    // .vue 文件：显式 vue-eslint-parser（ESLint 10 下 plugin-vue 的 processor 形态不生效，
    // 须以 parser 方式接入），脚本块用 TS 子解析器
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, sourceType: 'module' },
    },
  },
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      '@stylistic': stylistic,
      'import-x': importX,
    },
    rules: {
      // —— 代码风格（rules/code-style.md §1）——
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/indent': ['error', 2, { SwitchCase: 1, ignoredNodes: ['TemplateLiteral *'] }],
      // 单行长度建议 ≤ 100 字符但不强校验（rules/code-style.md §1.5），中文注释不受字符宽度约束
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/object-curly-spacing': ['error', 'always'],

      // import 分组排序：第三方包 → 本地模块，组间空行、组内字母序（rules/code-style.md §2）
      'import-x/order': [
        'error',
        {
          groups: [
            ['builtin', 'external'],
            ['internal', 'parent', 'sibling', 'index'],
          ],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'before' }],
          distinctGroup: true,
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': 'error',

      // 日志：允许 warn / error，禁散落 log（rules/code-style.md §5）
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Vue 模板专属：2 空格缩进、多 attribute 换行、模板属性双引号
    files: ['**/*.vue'],
    rules: {
      '@stylistic/indent': ['error', 2, { SwitchCase: 1, ignoredNodes: ['TemplateLiteral *'] }],
      'vue/max-attributes-per-line': ['error', { singleline: 4, multiline: 1 }],
      'vue/html-indent': ['error', 2],
      'vue/html-quotes': ['error', 'double'],

      // 页面入口为目录 + index.vue（views 惯例）；根组件 App、首页 Home 与登录页 Login 单词命名
      // （Home 是 keep-alive 缓存键契约：路由 name ↔ 页面 defineOptions name 对齐）
      'vue/multi-word-component-names': ['error', { ignores: ['App', 'Home', 'Login', 'index'] }],
    },
  },
  {
    // 测试与配置文件：用例名用中文描述，松绑控制台
    files: ['**/*.spec.ts', 'eslint.config.js', 'vite.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // 环境声明文件：interface 合并（ImportMetaEnv 等）无运行时引用，关闭未使用告警
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
)
