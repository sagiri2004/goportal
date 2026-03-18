module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  ignorePatterns: ['node_modules', 'dist', 'dist-electron', 'build'],
}
