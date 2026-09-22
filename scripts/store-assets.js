// Render the Chrome Web Store listing images.
//
//   node scripts/store-assets.js
//
// Output: docs/store/
//   screenshot-1.jpg  1280x800  popup + what it does
//   screenshot-2.jpg  1280x800  the on-page confirmation prompt
//   screenshot-3.jpg  1280x800  permissions / privacy
//   tile-small.jpg     440x280  small promo tile
//   tile-marquee.jpg  1400x560  marquee promo tile
//
// Everything is emitted as JPEG on purpose: the store rejects images with an
// alpha channel, and JPEG cannot carry one. Source shots come from
// docs/screenshots (regenerate those with scripts/screenshots.js first).

const path = require('path')
const fs = require('fs')
const { chromium } = require('@playwright/test')

const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'docs/store')

// Inlined as data URIs: pages built with setContent have an about:blank origin
// and cannot load file:// subresources.
const dataUrl = p =>
  'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, p)).toString('base64')

const POPUP = dataUrl('docs/screenshots/popup.png')
const CONFIRM = dataUrl('docs/screenshots/confirmation.png')
const ICON = dataUrl('icon128.png')

const base = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    color: #e8e9ec;
    background:
      radial-gradient(90% 80% at 100% 0%, rgba(255,107,53,0.18), transparent 60%),
      linear-gradient(180deg, #16171b 0%, #0e0f12 100%);
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }
  .accent { color: #ff6b35; }
  .shot { border-radius: 16px; box-shadow: 0 24px 60px rgba(0,0,0,0.55); display:block; }
`

// 1280x800 marketing slide: copy on the left, artwork on the right.
// copyWidth trades text column against art column; they must fit
// 1280 - 2*86 padding - 64 gap = 1044px between them.
const slide = ({ eyebrow, title, bullets, art, copyWidth = 600 }) => `
<!DOCTYPE html><meta charset="utf-8"><style>${base}
  .wrap { width:1280px; height:800px; display:flex; align-items:center; gap:64px; padding:0 86px; }
  .copy { width:${copyWidth}px; flex:none; }
  .eyebrow { font-size:19px; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
             color:#ff6b35; margin-bottom:20px; }
  h1 { font-size:58px; line-height:1.1; font-weight:700; letter-spacing:-.02em; margin-bottom:30px; }
  ul { list-style:none; }
  li { font-size:24px; line-height:1.5; color:#b9bcc4; margin-bottom:20px;
       padding-left:38px; position:relative; }
  li::before { content:''; position:absolute; left:0; top:11px; width:13px; height:13px;
               border-radius:50%; background:#ff6b35; }
  .art { flex:1; display:flex; align-items:center; justify-content:center; }
</style>
<div class="wrap">
  <div class="copy">
    <div class="eyebrow">${eyebrow}</div>
    <h1>${title}</h1>
    <ul>${bullets.map(b => `<li>${b}</li>`).join('')}</ul>
  </div>
  <div class="art">${art}</div>
</div>`

const SLIDES = [
  {
    file: 'screenshot-1.jpg',
    html: slide({
      eyebrow: 'Unofficial &middot; not affiliated with GGG',
      title: 'Never miss a<br>live search hit',
      bullets: [
        'Clicks <strong>Travel to hideout</strong> the moment a trade alert fires',
        'Also handles the <strong>Teleport anyway?</strong> follow-up',
        'Two toggles, nothing else to configure'
      ],
      art: `<img class="shot" src="${POPUP}" style="height:660px">`
    })
  },
  {
    file: 'screenshot-2.jpg',
    html: slide({
      eyebrow: 'Safe by design',
      title: 'It asks before<br>it clicks again',
      bullets: [
        'After each click, auto-click switches itself <strong>off</strong>',
        'A prompt appears on the page: continue, or stay disabled',
        'A burst of alerts can never teleport you repeatedly'
      ],
      art: `<img class="shot" src="${CONFIRM}" style="width:500px">`,
      copyWidth: 520
    })
  },
  {
    file: 'screenshot-3.jpg',
    html: slide({
      eyebrow: 'Private by default',
      title: 'Your data never<br>leaves the browser',
      bullets: [
        'No servers, no accounts, no tracking, no network requests',
        'Runs on <strong>pathofexile.com</strong> only, nowhere else',
        'The alert log lives in local storage and you can clear it'
      ],
      art: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:30px">
          <img src="${ICON}" style="width:190px;height:190px;border-radius:42px">
          <div style="font-size:27px;color:#8c8f97;text-align:center;line-height:1.55">
            storage &middot; activeTab &middot; scripting<br>
            <span style="color:#ff6b35">that is the whole permission list</span>
          </div>
        </div>`
    })
  }
]

// Promo tiles: logo + wordmark, no screenshot (they render small).
const tile = (w, h, iconSize, titleSize, subSize, gap) => `
<!DOCTYPE html><meta charset="utf-8"><style>${base}
  .wrap { width:${w}px; height:${h}px; display:flex; align-items:center;
          justify-content:center; gap:${gap}px; }
  .name { font-size:${titleSize}px; font-weight:700; letter-spacing:-.02em; line-height:1.15; }
  .sub  { font-size:${subSize}px; color:#8c8f97; margin-top:${Math.round(subSize * 0.5)}px; }
</style>
<div class="wrap">
  <img src="${ICON}" style="width:${iconSize}px;height:${iconSize}px;border-radius:${Math.round(iconSize * 0.22)}px">
  <div>
    <div class="name">Path of Exile<br>Trade <span class="accent">Auto-Clicker</span></div>
    <div class="sub">Unofficial &middot; travel to hideout, instantly</div>
  </div>
</div>`

const TILES = [
  { file: 'tile-small.jpg', w: 440, h: 280, html: tile(440, 280, 96, 30, 13, 22) },
  { file: 'tile-marquee.jpg', w: 1400, h: 560, html: tile(1400, 560, 260, 84, 34, 60) }
]

;(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()

  const shoot = async (html, width, height, file) => {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.setContent(html)
    // Make sure the embedded PNGs decoded before capturing.
    await page.evaluate(() =>
      Promise.all(Array.from(document.images).map(i => i.decode().catch(() => {})))
    )
    await page.screenshot({
      path: path.join(OUT_DIR, file),
      type: 'jpeg',
      quality: 92
    })
    await page.close()
    console.log(`saved ${file}  ${width}x${height}`)
  }

  for (const s of SLIDES) await shoot(s.html, 1280, 800, s.file)
  for (const t of TILES) await shoot(t.html, t.w, t.h, t.file)

  // Store icon: the guidelines ask for a 128x128 canvas with the mark at 96x96
  // and transparent padding, so it is PNG (with alpha) rather than JPEG.
  const iconPage = await browser.newPage({
    viewport: { width: 128, height: 128 },
    deviceScaleFactor: 1
  })
  await iconPage.setContent(`<!DOCTYPE html><meta charset="utf-8">
    <style>html,body{margin:0;background:transparent}
      body{width:128px;height:128px;display:flex;align-items:center;justify-content:center}
      img{width:96px;height:96px;border-radius:21px}</style>
    <img src="${ICON}">`)
  await iconPage.evaluate(() =>
    Promise.all(Array.from(document.images).map(i => i.decode().catch(() => {})))
  )
  await iconPage.screenshot({
    path: path.join(OUT_DIR, 'store-icon-128.png'),
    omitBackground: true
  })
  await iconPage.close()
  console.log('saved store-icon-128.png  128x128')

  await browser.close()
})()
