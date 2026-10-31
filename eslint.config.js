import javascriptESLint from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHookESLintPlugin from 'eslint-plugin-react-hooks';
import reactRefreshESLintPlugin from 'eslint-plugin-react-refresh';
import reactESLintPlugin from 'eslint-plugin-react';
import globals from 'globals';
import typescriptESLint from 'typescript-eslint';

const eslintConfig = typescriptESLint.config(
    {
        ignores: ['node_modules/**', '@types/**', 'dist/**', 'supabase/**', 'scripts/**', 'backups/**', '*.config.js', '*.config.ts', '*.json']
    },
    javascriptESLint.configs.recommended,
    reactESLintPlugin.configs.flat.recommended,
    ...typescriptESLint.configs.strict,
    ...typescriptESLint.configs.stylistic,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            globals: {
                ...globals.browser
            },
            parser: typescriptESLint.parser,
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname
            },
            sourceType: 'module'
        },
        plugins: {
            '@typescript-eslint': typescriptESLint.plugin,
            'react-hooks': reactHookESLintPlugin,
            'react-refresh': reactRefreshESLintPlugin,
            import: importPlugin
        },
        rules: {
            'array-bracket-newline': [
                'off'
            ],
            'array-bracket-spacing': [
                'error',
                'never'
            ],
            'array-element-newline': [
                'off'
            ],
            'arrow-parens': [
                'error',
                'always'
            ],
            'brace-style': [
                'error',
                'stroustrup',
                {
                    allowSingleLine: false
                }
            ],
            'comma-dangle': [
                'error',
                'never'
            ],
            'dot-location': [
                'error',
                'property'
            ],
            'eol-last': [
                'error',
                'never'
            ],
            'function-paren-newline': [
                'error',
                'consistent'
            ],
            'func-style': [
                'error',
                'declaration',
                {
                    allowArrowFunctions: false
                }
            ],
            'indent': [
                'error',
                4
            ],
            'import/no-relative-parent-imports': 'error',
            "jsx-quotes": ["error", "prefer-double"],
            'keyword-spacing': [
                'error',
                {
                    before: true,
                    after: true
                }
            ],
            'max-len': [
                'off',
                {
                    code: 200,
                    comments: 80
                }
            ],
            'multiline-ternary': ['error', 'always'],
            'newline-per-chained-call': [
                'error',
                {
                    ignoreChainWithDepth: 1
                }
            ],
            'no-console': ['error'],
            'no-multiple-empty-lines': [
                'error',
                {
                    max: 1
                }
            ],
            'no-multi-spaces': ['error'],
            'no-restricted-imports': [
                'error',
                {
                    patterns: ['../*', './*', '..']
                }
            ],
            'no-trailing-spaces': ['error'],
            'object-curly-newline': [
                'error',
                {
                    ImportDeclaration: {
                        minProperties: 5,
                        multiline: true
                    },
                    ObjectExpression: {
                        consistent: true,
                        minProperties: 3,
                        multiline: true
                    }
                }
            ],
            'object-curly-spacing': [
                'error',
                'always'
            ],
            'object-property-newline': [
                'error',
                {
                    'allowMultiplePropertiesPerLine': true
                }
            ],
            'operator-linebreak': [
                'error',
                'before'
            ],
            'quotes': [
                'error',
                'single'
            ],
            'semi': [
                'error',
                'always'
            ],
            'space-before-blocks': ['error', 'always'],
            'space-before-function-paren': [
                'error',
                'never'
            ],
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            'react/jsx-closing-bracket-location': ['error', 'tag-aligned'],
            'react/jsx-first-prop-new-line': ['error', 'multiline'],
            'react/jsx-max-props-per-line': [
                'error',
                {
                    maximum: 1
                }
            ],
            'react/jsx-sort-props': [
            'error',
                {
                    callbacksLast: true,
                    shorthandFirst: false,
                    shorthandLast: false,
                    ignoreCase: true,
                    noSortAlphabetically: false,
                    reservedFirst: false
                }
            ],
            'react/jsx-wrap-multilines': [
                'error',
                {
                    arrow: 'parens-new-line',
                    assignment: 'parens-new-line',
                    condition: 'parens-new-line',
                    declaration: 'parens-new-line',
                    logical: 'parens-new-line',
                    prop: 'parens-new-line',
                    return: 'parens-new-line'
                }
            ],
            'react/react-in-jsx-scope': 'off',
            'react-refresh/only-export-components': [
                'warn', {
                    allowConstantExport: true
                }
            ],
            'import/order': [
                'error',
                {
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true
                    },
                    groups: [
                        'internal',
                        'external',
                        'builtin',
                        'parent',
                        'sibling',
                        'index',
                        'object',
                        'type'
                    ],
                    'newlines-between': 'always',
                    pathGroups: [
                        {
                            pattern: '@/**',
                            group: 'internal',
                            position: 'before'
                        }
                    ],
                    pathGroupsExcludedImportTypes: [
                        'builtin'
                    ]
                }
            ]
        },
        settings: {
            react: {
                version: 'detect'
            }
        }
    }
);

export default eslintConfig;