# Chrome Web Store listing copy

Paste-ready values for the Store listing and Privacy tabs.
Regenerate the images with `npm run store-assets`.

---

## Titel van pakket

```
Path of Exile Trade Auto-Clicker
```

## Samenvatting van pakket

```
Unofficial. Clicks "Travel to hideout" when a Path of Exile trade alert fires, then asks you to confirm before the next one.
```

## Beschrijving

```
Unofficial extension. Not affiliated with, endorsed by, or sponsored by Grinding Gear Games.

Live search on the Path of Exile trade site fires a browser notification the instant a matching item is listed. The seller usually gets several whispers within seconds, so whoever reacts first wins the item. This extension reacts for you.

WHAT IT DOES

When a trade alert fires on pathofexile.com, the extension clicks the "Travel to hideout" button for you, and handles the "Teleport anyway?" follow-up prompt when the seller is already busy. Every alert lands in a log in the popup with a timestamp and what happened to it, so you can always see what it did.

IT ASKS BEFORE IT CLICKS AGAIN

Auto-click switches itself off after every single click. A prompt appears on the page asking whether to keep monitoring or stay disabled. Nothing happens again until you answer.

This is deliberate. A busy live search can fire a dozen alerts in a minute, and without that stop you would be teleported around repeatedly with no way to keep up. One click, one confirmation.

PRECISE BY DESIGN

Only the real hideout button is clicked. Decoy links, hidden buttons, and disabled buttons are skipped, so a page layout change cannot make it click something you did not intend.

PRIVACY

There is no server, no account, no analytics, and no tracking. The extension makes no network requests of its own. Your two toggle settings and the alert log live in your browser's local storage and nowhere else, and the popup's Clear button erases the log.

It runs on https://www.pathofexile.com only. It has no access to any other site.

The entire permission list is storage, activeTab, and scripting.

HOW TO USE IT

1. Open your live search on the Path of Exile trade site.
2. Click the extension icon and turn on both toggles: "Enable extension" and "Auto-click hideout".
3. Leave the tab open. When an alert fires it clicks through, logs the alert, and asks whether to continue.
4. Click "Continue monitoring" to arm it for the next one.

Product page: https://dno-ontwikkeling.com/products/poe-trade-alert
Open source. Source code, issue tracker, and release notes:
https://github.com/dno-ontwikkeling/poe-live-trade-extension

"Path of Exile" is a trademark of Grinding Gear Games.
```

## Categorie

`Games` — it is a game-specific utility, which is where players will look.
`Tools` if you would rather not sit next to actual games.

## Taal

`English (United States)` — all listing copy above is English.

## Afbeeldingen

| Field | File |
| --- | --- |
| Winkelicoon (128x128) | `docs/store/store-icon-128.png` |
| Screenshots (1280x800) | `docs/store/screenshot-1.jpg`, `screenshot-2.jpg`, `screenshot-3.jpg` |
| Kleine promotietegel (440x280) | `docs/store/tile-small.jpg` |
| Marquee-promotietegel (1400x560) | `docs/store/tile-marquee.jpg` |

Screenshots and tiles are JPEG because the store rejects images carrying an
alpha channel.

## Extra velden

| Field | Value |
| --- | --- |
| Officiële URL | `dno-ontwikkeling.com` — verify the domain in Google Search Console first, then it becomes selectable. Worth doing: a verified official site reads as more trustworthy than a bare GitHub link |
| URL van homepage | `https://dno-ontwikkeling.com/products/poe-trade-alert` |
| URL voor support | `https://dno-ontwikkeling.com/contact` |
| Content voor volwassenen | No |

After the extension is approved, update the product page: it currently tells
visitors to install unpacked via Developer mode, which will no longer be the
recommended route.

---

# Privacy tab

## Eén doel (single purpose)

```
The extension has one purpose: when a Path of Exile trade alert fires on pathofexile.com, it clicks the "Travel to hideout" button on that page and then asks the user to confirm before it will do so again.
```

## Motivering per machtiging

**storage**
```
Stores the two user settings (extension enabled, auto-click enabled) and the local log of recent alerts shown in the popup. Nothing is stored anywhere but the user's own browser.
```

**activeTab**
```
Lets the extension act on the Path of Exile trade tab the user is currently working in, so it can locate and click the "Travel to hideout" button on that page.
```

**scripting**
```
Injects the content script that detects an incoming trade alert and clicks the hideout button. Auto-click cannot work without injecting that script into the trade page.
```

**Host permission `https://www.pathofexile.com/*`**
```
The "Travel to hideout" button only exists on the Path of Exile trade site. This host permission scopes the extension to that site and nothing else.
```

## Gebruik van gegevens

Tick **does not collect user data** and certify all three compliance
statements. The extension makes no network requests and transmits nothing.

## Privacybeleid-URL

```
https://dno-ontwikkeling.com/poe-trade-alert/privacy-policy.html
```

**Live only after the website is deployed.** The page source lives in the
website repo at
`src/DNO.Development.Web/wwwroot/poe-trade-alert/privacy-policy.html`, built to
mirror the PadelCompanion one. Confirm it returns 200 before you submit — the
store checks the URL.

Do **not** use `https://dno-ontwikkeling.com/privacy` instead. That page
documents the website only: contact form, Google Analytics, cookies, GDPR
rights. It says nothing about what the extension stores or transmits, so a
reviewer checking it finds no answer and can reject on an inadequate privacy
policy.

`docs/PRIVACY.md` in this repo carries the same content in markdown, for
contributors reading the source.
