module.exports = {
  "env": {
    "node": true,
    "es2022": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:playwright/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "playwright"],
  "rules": {
    "playwright/no-wait-for-timeout": "warn",
    "@typescript-eslint/no-floating-promises": "error"
  },
  "parserOptions": {
    "project": "./tsconfig.json"
  }
}