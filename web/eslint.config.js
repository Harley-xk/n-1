// 前端 ESLint 扁平配置（eslint 9 + eslint-plugin-vue + typescript-eslint + @stylistic + import-x），风格规则见 rules/code-style.md
import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import importX from 'eslint-plugin-import-x'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  // 代码风格：无分号、单引号、2 空格缩进（rules/code-style.md）
  stylistic.configs.customize({
    semi: false,
    quotes: 'single',
    indent: 2,
    jsx: false,
    quoteProps: 'as-needed',
  }),
  {
    plugins: { 'import-x': importX },
    rules: {
      // import 分组排序：副作用导入 → 内置/第三方包 → 本地模块，组间空行，组内字母序
      'import-x/order': [
        'error',
        {
          groups: [
            'unknown',
            ['builtin', 'external'],
            ['internal', 'parent', 'sibling', 'index'],
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/newline-after-import': 'error',
      // 根组件 App.vue 允许单词命名
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        // .vue 文件中 <script> 块使用 typescript 解析器
        parser: tseslint.parser,
      },
    },
    rules: {
      // .vue 文件的 script 块缩进交给 vue/script-indent（baseIndent 1 相对 <script> 标签）
      '@stylistic/indent': 'off',
      'vue/script-indent': ['error', 2, { baseIndent: 1 }],
      'vue/html-indent': ['error', 2],
    },
  },
]
