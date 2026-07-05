# Contributing to CartLens

Thanks for considering a contribution!

## Reporting a bug

The most common failure mode is Amazon changing the cart page markup, which
breaks the CSS selectors CartLens relies on. When reporting this:

1. Open DevTools on your Amazon Cart page, find the
   `#cart-important-message-box` element.
2. Save a **sanitized** copy of that HTML (remove your name, address, order
   IDs, session tokens, and any personal product info you don't want public).
3. Attach it to a new issue along with your Amazon domain (e.g. `amazon.de`)
   and browser version.

## Development setup

CartLens has no build step — it's plain HTML/CSS/JS loaded directly by
Chrome.

1. Clone the repo.
2. Go to `chrome://extensions`, enable Developer mode, click **Load
   unpacked**, and select the `cartlens/` folder.
3. Edit files in `cartlens/` and click the reload icon on the extension card
   to pick up changes.

## Testing selector changes

If you're changing the scraping logic in `cartlens/content.js`, test against
a saved cart page HTML snapshot rather than guessing:

```bash
npm install --no-save jsdom@24
node -e "
const fs = require('fs');
const { JSDOM } = require('jsdom');
const dom = new JSDOM(fs.readFileSync('your-saved-cart.html', 'utf-8'));
// ... exercise the scraping function against dom.window.document
"
```

Never commit real cart page snapshots — they contain personal account data.
`.gitignore` already excludes `cartPage*.html`.

## Pull requests

- Keep PRs focused on a single change.
- Explain *why* the change is needed, not just what it does.
- If you're fixing a broken selector, note which Amazon domain/locale you
  tested against.
