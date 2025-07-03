import medicConfig from '@medic/eslint-config';
import globals from 'globals';
import js from '@eslint/js';
import nPlugin from 'eslint-plugin-n';

export default [
  { ignores: ['**/build', 'test/data/**'] },
  {
    files: [
      'src/**/*.js',
      'test/*.js',
      'test/**/*.js'
    ],
    plugins: {
      n: nPlugin
    },
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...medicConfig.rules,
      ...nPlugin.configs.recommended.rules,
      eqeqeq: 'error',
      'no-bitwise': 'error',
      'no-buffer-constructor': 'error',
      'no-caller': 'error',
      'no-console': 'error',
      semi: [
        'error',
        'always'
      ],
      quotes: [
        'error',
        'single',
        {
          allowTemplateLiterals: true
        }
      ]
    },
  },
];
