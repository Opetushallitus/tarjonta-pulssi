/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  // Base config
  extends: ["eslint:recommended"],
  overrides: [
    // React
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      plugins: ["react", "jsx-a11y"],
      extends: [
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
        "plugin:jsx-a11y/recommended",
        "prettier",
      ],
      settings: {
        react: {
          version: "detect",
        },
        formComponents: ["Form"],
        linkComponents: [
          { name: "Link", linkAttribute: "to" },
          { name: "NavLink", linkAttribute: "to" },
        ],
      },
      rules: {
        "react/jsx-no-leaked-render": ["warn", { validStrategies: ["ternary"] }],
      },
    },

    // Typescript
    {
      files: ["**/*.{ts,tsx}"],
      plugins: ["@typescript-eslint", "import"],
      parser: "@typescript-eslint/parser",
      settings: {
        "import/internal-regex": "^~/",
        "import/resolver": {
          node: {
            extensions: [".ts", ".tsx"],
          },
          typescript: {
            alwaysTryTypes: true,
          },
        },
      },
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/stylistic",
        "plugin:import/recommended",
        "plugin:import/typescript",
        "prettier",
      ],
      rules: {
        "import/order": [
          "error",
          {
            alphabetize: { caseInsensitive: true, order: "asc" },
            groups: ["builtin", "external", "internal", "parent", "sibling"],
            "newlines-between": "always",
          },
        ],
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
          },
        ],
        "@typescript-eslint/array-type": [
          "error",
          {
            default: "generic",
          },
        ],
      },
    },

    // Markdown
    {
      files: ["**/*.md"],
      plugins: ["markdown"],
      extends: ["plugin:markdown/recommended", "prettier"],
    },

    // Jest/Vitest
    {
      files: ["**/*.test.{js,jsx,ts,tsx}"],
      plugins: ["jest", "jest-dom"],
      extends: ["plugin:jest/recommended", "plugin:jest-dom/recommended", "prettier"],
      env: {
        "jest/globals": true,
      },
      settings: {
        jest: {
          // we're using vitest which has a very similar API to jest
          // (so the linting plugins work nicely), but it means we have to explicitly
          // set the jest version.
          version: 28,
        },
      },
    },
  ],
};
