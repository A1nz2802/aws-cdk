import globals from "globals";
import eslint from "@eslint/js";
import nodePlugin from "eslint-plugin-n";
import eslintPluginSimpleImportSort from "eslint-plugin-simple-import-sort";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  {
    ignores: ["cdk.out/**", "eslint.config.mjs"]
  },
  {
    files: ['bin/**/*.ts', 'lib/**/*.ts'],
    extends: [
      tseslint.configs.recommendedTypeChecked,
      eslint.configs.recommended,
      eslintPluginUnicorn.configs.recommended,
      nodePlugin.configs["flat/recommended-module"],
      eslintPluginPrettier,
    ]
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      parser: tseslint.parser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "simple-import-sort": eslintPluginSimpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "n/no-missing-import": "off",
      "unicorn/prevent-abbreviations": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-unused-vars": "warn",
    }, 
  },
  // from .prettierrc
  {
    rules: {
      "prettier/prettier": [
        "error",
        {
          printWidth: 80,
          tabWidth: 2,
          useTabs: false,
          semi: true,
          singleQuote: true,
          trailingComma: "all",
          bracketSpacing: true,
          arrowParens: "avoid"
        }
      ]
    }
  }
)