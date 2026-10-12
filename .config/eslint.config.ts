// @ts-check
import { fileURLToPath } from 'node:url'
import tailwind from 'eslint-plugin-tailwindcss'
import unicorn from 'eslint-plugin-unicorn'
import withNuxt from '../.nuxt/eslint.config.mjs'
import guardBraces from './eslint-guard-braces.js'

export default withNuxt({
  plugins: {
    entu: { rules: { 'guard-braces': guardBraces } },
    unicorn
  },
  rules: {
    // Guard clauses stay inline and brace-less (`if (x) return` /
    // `continue` / `break` — value-less only); every other if/else/loop
    // body, including `return <value>`, must be a multiline braced
    // block. Enforced by three rules together:
    // - curly multi-line: anything spanning lines needs braces
    // - nonblock-statement-body-position: a brace-less body sits on the
    //   same line as its `if`
    // - entu/guard-braces (local, auto-fixable): only a bare guard may
    //   go brace-less, and a block holding ONLY a bare guard is inlined
    curly: ['error', 'multi-line'],
    '@stylistic/nonblock-statement-body-position': ['error', 'beside'],
    'entu/guard-braces': 'error',
    '@stylistic/arrow-parens': ['error', 'always'],
    '@stylistic/brace-style': ['error', 'stroustrup'],
    '@stylistic/comma-dangle': ['error', 'never'],
    '@stylistic/eol-last': 'error',
    '@stylistic/indent': ['error', 2],
    '@stylistic/no-multi-spaces': 'error',
    '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
    '@stylistic/no-trailing-spaces': 'error',
    '@stylistic/object-curly-spacing': ['error', 'always'],
    '@stylistic/quote-props': ['error', 'as-needed'],
    '@stylistic/space-before-function-paren': ['error', 'always'],
    'unicorn/no-duplicate-if-branches': 'error',
    'unicorn/no-for-each': 'error',
    'unicorn/no-lonely-if': 'error',
    'unicorn/no-useless-undefined': 'error',
    'unicorn/prefer-array-flat-map': 'error',
    'unicorn/prefer-at': 'error',
    'unicorn/prefer-boolean-return': 'error',
    'unicorn/prefer-date-now': 'error',
    'unicorn/prefer-early-return': 'error',
    'unicorn/prefer-else-if': 'error',
    'unicorn/prefer-includes': 'error',
    'unicorn/prefer-number-properties': 'error',
    'unicorn/prefer-simplified-conditions': 'error',
    'unicorn/prefer-string-slice': 'error',
    'vue/attributes-order': ['error', {
      alphabetical: true,
      order: [
        'DEFINITION',
        'LIST_RENDERING',
        'CONDITIONALS',
        'RENDER_MODIFIERS',
        'GLOBAL',
        ['UNIQUE', 'SLOT'],
        'TWO_WAY_BINDING',
        ['OTHER_DIRECTIVES', 'CONTENT'],
        ['ATTR_STATIC', 'ATTR_SHORTHAND_BOOL'],
        'ATTR_DYNAMIC',
        'EVENTS'
      ]
    }],
    'vue/component-name-in-template-casing': ['error', 'kebab-case'],
    'vue/define-emits-declaration': 'error',
    'vue/multi-word-component-names': 'off',
    'vue/prefer-true-attribute-shorthand': 'error',
    'vue/prefer-use-template-ref': 'error'
  }
}).prepend([
  {
    ignores: ['.claude/']
  },
  tailwind.configs.recommended,
  {
    settings: {
      tailwindcss: {
        cssConfigPath: fileURLToPath(new URL('../app/assets/tailwind.css', import.meta.url))
      }
    }
  }
])
