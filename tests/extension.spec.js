const path = require('path')
const fs = require('fs')
const { test, expect, chromium } = require('@playwright/test')

const EXTENSION_PATH = path.resolve(__dirname, '..')
const TRADE_URL = 'https://www.pathofexile.com/trade/search/Standard'
const TRADE_ORIGIN = 'https://www.pathofexile.com'
const FIXTURE_HTML = fs.readFileSync(
  path.resolve(__dirname, 'fixtures/trade.html'),
  'utf8'
)

let context

// Get the extension's background service worker, waiting for it if needed.
async function getServiceWorker (ctx) {
  let [sw] = ctx.serviceWorkers()
  if (!sw) sw = await ctx.waitForEvent('serviceworker')
  return sw
}

test.beforeEach(async () => {
  // Extensions only work in a persistent context; `channel: 'chromium'`
  // enables the new headless mode that supports them.
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  })

  // Serve the local fixture as if it were the real trade page so the
  // background worker auto-injects the scripts on navigation.
  await context.route(`${TRADE_ORIGIN}/trade/**`, route =>
    route.fulfill({ contentType: 'text/html', body: FIXTURE_HTML })
  )
  await context.grantPermissions(['notifications'], { origin: TRADE_ORIGIN })
})

test.afterEach(async () => {
  await context.close()
})

// Enable the extension + auto-click via storage before navigating.
async function enableExtension () {
  const sw = await getServiceWorker(context)
  await sw.evaluate(() =>
    chrome.storage.local.set({
      extensionEnabled: true,
      autoClickEnabled: true,
      alertHistory: []
    })
  )
}

test('auto-clicks the hideout button when a notification fires', async () => {
  await enableExtension()

  const page = await context.newPage()
  await page.goto(TRADE_URL)

  // Wait until both the page-context proxy and the content script are live.
  await page.waitForFunction(() => window.__POE_EXTENSION_INJECTED === true)
  await page.waitForSelector('html[data-poe-ready="1"]')

  // Fire the notification the extension is meant to intercept.
  await page.evaluate(
    () => new Notification('POE Trade Alert', { body: 'Item listed' })
  )

  // Hideout button gets clicked, then the "Teleport anyway" button.
  await expect(page.locator('#hideout')).toHaveAttribute('data-clicked', 'true')
  await expect(page.locator('#teleport')).toHaveAttribute(
    'data-clicked',
    'true'
  )

  // The decoy link that only mentions "hideout" must be left alone.
  await expect(page.locator('#decoy')).toHaveAttribute('data-clicked', 'false')

  // Confirmation prompt is shown after the click.
  await expect(page.locator('#poe-extension-notification')).toBeVisible()
})

test('does not click when auto-click is disabled', async () => {
  const sw = await getServiceWorker(context)
  await sw.evaluate(() =>
    chrome.storage.local.set({
      extensionEnabled: true,
      autoClickEnabled: false,
      alertHistory: []
    })
  )

  const page = await context.newPage()
  await page.goto(TRADE_URL)
  await page.waitForFunction(() => window.__POE_EXTENSION_INJECTED === true)
  await page.waitForSelector('html[data-poe-ready="1"]')

  await page.evaluate(
    () => new Notification('POE Trade Alert', { body: 'Item listed' })
  )

  // Give the extension a moment; the button must stay unclicked.
  await page.waitForTimeout(1000)
  await expect(page.locator('#hideout')).toHaveAttribute(
    'data-clicked',
    'false'
  )
})

test('records intercepted alerts in storage history', async () => {
  await enableExtension()

  const page = await context.newPage()
  await page.goto(TRADE_URL)
  await page.waitForFunction(() => window.__POE_EXTENSION_INJECTED === true)
  await page.waitForSelector('html[data-poe-ready="1"]')

  await page.evaluate(
    () => new Notification('POE Trade Alert', { body: 'Mirror of Kalandra' })
  )
  await expect(page.locator('#hideout')).toHaveAttribute('data-clicked', 'true')

  const sw = await getServiceWorker(context)
  const history = await sw.evaluate(async () => {
    const { alertHistory } = await chrome.storage.local.get({ alertHistory: [] })
    return alertHistory
  })

  expect(history.length).toBeGreaterThan(0)
  expect(history[history.length - 1].message).toContain('Mirror of Kalandra')
})
