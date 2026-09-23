// 后端 ESLint 扁平配置（eslint 9 + typescript-eslint + @stylistic + import-x），风格规则见 rules/code-style.md
// @ts-check
import eslint from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import importX from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
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
      // 后端禁止 console，日志必须使用 NestJS 内置 Logger
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
)
