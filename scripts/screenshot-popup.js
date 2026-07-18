// Render popup.html in Chromium with a realistic populated state and save a
// screenshot for visual review. Standalone (no extension load needed).
const path = require('path')
const { chromium } = require('@playwright/test')

const POPUP = 'file://' + path.resolve(__dirname, '../popup.html').replace(/\\/g, '/')
const OUT = path.resolve(__dirname, '../popup-preview.png')

;(async () => {
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 380, height: 620 } })

  // This is a pure visual preview, so block popup.js (its live chrome.* logic
  // is irrelevant here and its change handlers fight the manual toggles).
  await context.route('**/popup.js', route =>
    route.fulfill({ contentType: 'application/javascript', body: '' })
  )

  const page = await context.newPage()
  await page.goto(POPUP)

  // Toggle both switches on with real clicks on the visible sliders.
  await page.locator('.slider').nth(0).click()
  await page.locator('.slider').nth(1).click()

  // Simulate the enabled + monitoring state and a few logged alerts.
  await page.evaluate(() => {
    const ind = document.querySelector('.status-indicator')
    ind.classList.remove('inactive')
    ind.classList.add('active')
    document.getElementById('statusText').textContent = 'Active - Monitoring alerts'
    const hint = document.getElementById('monitoringStatus')
    hint.textContent = '✅ Monitoring active on this page!'
    hint.style.color = '#4ade80'

    const log = document.getElementById('alertLog')
    const rows = [
      ['14:32:07', 'success', 'Button Clicked', 'Mirror of Kalandra listed for 240 divine'],
      ['14:28:51', 'info', 'Intercepted', 'Headhunter, Leather Belt'],
      ['14:21:19', 'warning', 'Button Not Found', 'Divine Orb x20']
    ]
    log.innerHTML = rows
      .map(
        ([t, cls, label, msg]) => `
        <div class="alert-item">
          <div class="alert-header">
            <span class="alert-time">${t}</span>
            <span class="badge badge-${cls}">${label}</span>
          </div>
          <div class="alert-message">${msg}</div>
        </div>`
      )
      .join('')
  })

  await page.waitForTimeout(500) // let the toggle transitions settle
  await page.screenshot({ path: OUT })
  await browser.close()
  console.log('Saved', OUT)
})()
