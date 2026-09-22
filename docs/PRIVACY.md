# Privacy Policy

**Path of Exile Trade Auto-Clicker** (the "extension")

Last updated: 22 September 2026

## Summary

The extension does not collect, transmit, sell, or share any data. There is no
server, no account, and no analytics. Everything it stores stays in your own
browser.

## What the extension stores

The extension writes three things to `chrome.storage.local`, which is storage
private to your browser profile:

| Stored value | Purpose |
| --- | --- |
| `extensionEnabled` | Whether monitoring is switched on |
| `autoClickEnabled` | Whether auto-click is switched on |
| `alertHistory` | A local log of recent trade alerts (timestamp, alert text, outcome) |

The alert log exists so the popup can show you what happened. It never leaves
your machine. You can erase it at any time with the **Clear** button in the
popup, or by removing the extension.

## What the extension does not do

- It does not send any network request of its own.
- It does not use cookies, tracking pixels, fingerprinting, or analytics.
- It does not read your Path of Exile account, characters, or credentials.
- It does not collect personally identifiable information, health data,
  financial data, location, browsing history, or keystrokes.
- It does not transfer any data to third parties.

## Where it runs

The extension is limited to `https://www.pathofexile.com/*`. It has no access
to any other website.

## Permissions and why they are needed

| Permission | Why |
| --- | --- |
| `storage` | Save the two toggle settings and the local alert log |
| `activeTab` | Act on the Path of Exile trade tab you are currently using |
| `scripting` | Insert the script that detects a trade alert and clicks the hideout button |
| `https://www.pathofexile.com/*` | Restrict all of the above to the trade site only |

## Changes

Any change to this policy will be published on this page, with an updated date.

## Contact

Questions or concerns: open an issue at
<https://github.com/dno-ontwikkeling/poe-live-trade-extension/issues>, or use
the contact form at <https://dno-ontwikkeling.com/contact>.

The extension is published by DNO Ontwikkeling, Noordlaan 17 bus 2, 9200
Dendermonde, Belgium.

---

This extension is unofficial and is not affiliated with, endorsed by, or
sponsored by Grinding Gear Games. "Path of Exile" is a trademark of Grinding
Gear Games.
