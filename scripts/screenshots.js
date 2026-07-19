// Capture promo/documentation screenshots of the extension with a real
// Chromium + the unpacked extension loaded (same setup as the E2E tests).
//
//   node scripts/screenshots.js
//
// Output: docs/screenshots/{popup,confirmation}.png
//
// Shots:
//   popup.png        - the toolbar popup, enabled with a populated alert log
//   confirmation.png - the on-page confirmation prompt over the trade page,
//                      after the extension auto-clicked "Travel to hideout"

const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')

const EXTENSION_PATH = path.resolve(__dirname, '..')
const OUT_DIR = path.resolve(__dirname, '../docs/screenshots')
const TRADE_ORIGIN = 'https://www.pathofexile.com'
const TRADE_URL = `${TRADE_ORIGIN}/trade/search/Standard`
const HARNESS_HTML = fs.readFileSync(
  path.resolve(__dirname, '../tests/fixtures/test-page.html'),
  'utf8'
)

// A believable alert log for the popup hero shot.
const now = Date.now()
const SAMPLE_HISTORY = [
  { timestamp: now - 41000, message: 'Chaos Orb ×500 listed for 4 divine', action: 'button_clicked' },
  { timestamp: now - 28000, message: 'Divine Orb ×20 listed for 20 chaos each', action: 'button_clicked' },
  { timestamp: now - 12000, message: 'Mirror of Kalandra listed for 240 divine', action: 'button_clicked' },
  { timestamp: now - 4000, message: 'Headhunter listed for 180 divine', action: 'intercepted' }
]

async function getServiceWorker (ctx) {
  let [sw] = ctx.serviceWorkers()
  if (!sw) sw = await ctx.waitForEvent('serviceworker')
  return sw
}

;(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const context = await chromium.launchPersistentContext('', {
    headless: true,
    channel: 'chromium',
    deviceScaleFactor: 2, // crisp, retina-quality PNGs
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  })

  const sw = await getServiceWorker(context)
  const extensionId = new URL(sw.url()).host

  // Seed enabled state + a populated alert log for the popup shot.
  await sw.evaluate(hist =>
    chrome.storage.local.set({
      extensionEnabled: true,
      autoClickEnabled: true,
      alertHistory: hist
    }),
    SAMPLE_HISTORY
  )

  // --- Shot 1: the popup ---
  const popup = await context.newPage()
  await popup.setViewportSize({ width: 440, height: 900 })
  await popup.goto(`chrome-extension://${extensionId}/popup.html`)
  await popup.waitForSelector('.alert-item') // wait for the log to render
  await popup.locator('.container').screenshot({
    path: path.join(OUT_DIR, 'popup.png')
  })
  console.log('saved popup.png')

  // --- Shot 2: the on-page confirmation prompt ---
  await context.grantPermissions(['notifications'], { origin: TRADE_ORIGIN })
  await context.route(`${TRADE_ORIGIN}/trade/**`, route =>
    route.fulfill({ contentType: 'text/html', body: HARNESS_HTML })
  )

  const page = await context.newPage()
  await page.setViewportSize({ width: 1280, height: 860 })
  await page.goto(TRADE_URL)
  await page.waitForFunction(() => window.__POE_EXTENSION_INJECTED === true)
  await page.waitForSelector('html[data-poe-ready="1"]')

  // Fire the trade notification the extension intercepts + acts on.
  await page.evaluate(
    () => new Notification('POE Trade Alert', {
      body: 'Mirror of Kalandra listed for 240 divine'
    })
  )

  // Wait for the auto-click to land and the confirmation prompt to appear.
  const dialog = page.locator('#poe-extension-notification')
  await dialog.waitFor({ state: 'visible' })
  await page.waitForTimeout(400) // let the entrance transition settle
  // Capture just the prompt, not the test page behind it.
  await dialog.screenshot({ path: path.join(OUT_DIR, 'confirmation.png') })
  console.log('saved confirmation.png')

  await context.close()
})().catch(err => {
  console.error(err)
  process.exit(1)
})
