// Launch a headed Chromium with the unpacked extension loaded, serving the
// test fixture in place of the real trade page. Stays open until you close
// the browser window (or Ctrl+C).
//
//   node scripts/launch.js            # fixture trade page (offline)
//   node scripts/launch.js --real     # the real pathofexile.com trade site

const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')

const EXTENSION_PATH = path.resolve(__dirname, '..')
const TRADE_ORIGIN = 'https://www.pathofexile.com'
const TRADE_URL = `${TRADE_ORIGIN}/trade/search/Standard`
const FIXTURE_HTML = fs.readFileSync(
  path.resolve(__dirname, '../tests/fixtures/trade.html'),
  'utf8'
)

const useReal = process.argv.includes('--real')

;(async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  })

  // Enable the extension + auto-click up front.
  let [sw] = context.serviceWorkers()
  if (!sw) sw = await context.waitForEvent('serviceworker')
  await sw.evaluate(() =>
    chrome.storage.local.set({
      extensionEnabled: true,
      autoClickEnabled: true,
      alertHistory: []
    })
  )

  await context.grantPermissions(['notifications'], { origin: TRADE_ORIGIN })

  if (!useReal) {
    // Serve the fixture as if it were the trade page.
    await context.route(`${TRADE_ORIGIN}/trade/**`, route =>
      route.fulfill({ contentType: 'text/html', body: FIXTURE_HTML })
    )
  }

  const page = context.pages()[0] || (await context.newPage())
  await page.goto(TRADE_URL)

  console.log('Extension loaded and enabled.')
  if (!useReal) {
    console.log(
      'Fixture page open. Fire a test notification from the DevTools console:'
    )
    console.log("  new Notification('POE Trade Alert', { body: 'Item listed' })")
    console.log('The "Travel to hideout" button should get auto-clicked.')
  }
  console.log('Close the browser window to exit.')

  // Keep the process alive until the browser is closed.
  await new Promise(resolve => context.on('close', resolve))
})()
