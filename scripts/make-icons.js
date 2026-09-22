// Render the extension icon to icon16/48/128.png.
//
//   node scripts/make-icons.js
//
// The artwork is original (no game assets): a cursor mark on a rounded orange
// tile, kept deliberately simple so it stays readable at 16px.

const path = require('path')
const { chromium } = require('@playwright/test')

const SIZES = [16, 48, 128]
const OUT_DIR = path.resolve(__dirname, '..')

// viewBox is 128x128; everything scales from there.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff8c42"/>
      <stop offset="1" stop-color="#e8531c"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="128" height="128" rx="28" fill="url(#bg)"/>
  <!-- click ripple -->
  <circle cx="64" cy="62" r="34" fill="none" stroke="#fff" stroke-width="7" opacity="0.35"/>
  <!-- cursor -->
  <path d="M50 34 L50 92 L64 78 L74 100 L86 94 L76 72 L95 70 Z"
        fill="#fff" stroke="#e8531c" stroke-width="5" stroke-linejoin="round"/>
</svg>`

const html = `<!DOCTYPE html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}
svg{display:block;width:100vw;height:100vh}</style>${svg}`

;(async () => {
  const browser = await chromium.launch()
  for (const size of SIZES) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1
    })
    await page.setContent(html)
    await page.screenshot({
      path: path.join(OUT_DIR, `icon${size}.png`),
      omitBackground: true
    })
    await page.close()
    console.log(`Wrote icon${size}.png`)
  }
  await browser.close()
})()
