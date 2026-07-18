// Launch a headed Chromium with the unpacked extension loaded, serving the
// interactive test harness in place of the real trade page (so the extension
// injects and behaves exactly as in production). Stays open until you close
// the browser window (or Ctrl+C).
//
//   node scripts/launch.js            # interactive test harness (offline)
//   node scripts/launch.js --real     # the real pathofexile.com trade site

const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')

const EXTENSION_PATH = path.resolve(__dirname, '..')
const TRADE_ORIGIN = 'https://www.pathofexile.com'
const TRADE_URL = `${TRADE_ORIGIN}/trade/search/Standard`
const HARNESS_HTML = fs.readFileSync(
  path.resolve(__dirname, '../tests/fixtures/test-page.html'),
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
    // Serve the interactive harness as if it were the trade page.
    await context.route(`${TRADE_ORIGIN}/trade/**`, route =>
      route.fulfill({ contentType: 'text/html', body: HARNESS_HTML })
    )
  }

  const page = context.pages()[0] || (await context.newPage())
  await page.goto(TRADE_URL)

  console.log('Extension loaded and enabled.')
  if (!useReal) {
    console.log('Interactive test harness open.')
    console.log('Pick a preset (or scenario), then "Fire trade notification".')
    console.log('Watch the target rows and activity log to see what got clicked.')
  }
  console.log('Close the browser window to exit.')

  // Keep the process alive until the browser is closed.
  await new Promise(resolve => context.on('close', resolve))
})()
