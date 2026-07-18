const { defineConfig } = require('@playwright/test')

// Chrome extensions require a persistent context, launched per-test in the
// spec itself, so there is no `projects` browser here.
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list'
})
