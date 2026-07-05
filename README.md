# CartLens

**See every price change in your Amazon Cart at a glance — sorted, in one table.**

Amazon buries price-change notices in a wall of text under "Important messages
for items in your Cart." CartLens reads that section automatically and
replaces it with a clean, sortable table: product name (linked), old price,
new price, and percent change — so the best drops (and the sneaky increases)
jump out immediately.

![CartLens screenshot](docs/screenshot.png)

## Features

- **Fully automatic** — the table appears as soon as you load your Amazon Cart
  page. No click required.
- **Sortable columns** — click any header (Product, Old Price, New Price, %
  Change) to sort ascending/descending.
- **Sorted by biggest change first** — by default, items are ranked by percent
  change so the largest price drops surface immediately.
- **Color-coded** — price drops in green, increases in red.
- **Works across Amazon storefronts** — .com, .in, .co.uk, .de, .ca, .fr, .it,
  .es, .co.jp, .com.au, .com.mx, .com.br, .nl, .se, .pl, .sg, .ae, .sa.
- **Private by design** — runs entirely client-side. No data leaves your
  browser, no analytics, no external requests.

## Installation

### From the Chrome Web Store

_(coming soon — link will go here once published)_

### Manual install (load unpacked)

1. Clone or [download this repo](../../archive/refs/heads/main.zip).
2. Open `chrome://extensions` in Chrome (or any Chromium browser — Edge,
   Brave, Arc).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `cartlens/` folder.
5. Visit your [Amazon Cart](https://www.amazon.com/gp/cart/view.html) — the
   table appears automatically above the existing price-change notices.

## How it works

CartLens is a Manifest V3 content script. It looks for Amazon's
`single-imb-message` price-change notices in the cart page DOM, parses the
product link, old price, and new price out of each one, computes the percent
change, and renders a table in their place. A `MutationObserver` re-renders
the table if Amazon updates the cart asynchronously.

No network requests, no remote code, no tracking — everything happens in the
page you already have open.

## Contributing

Bug reports and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

Amazon frequently A/B tests its cart page markup, so selector breakage is the
most common type of bug. If your table stops appearing, please open an issue
with a sanitized HTML snippet of the "Important messages" section (strip your
personal data first).

## Privacy

CartLens requests `activeTab` and `scripting` permissions and host permissions
scoped to Amazon cart pages only. It does not collect, store, or transmit any
data. See [PRIVACY.md](PRIVACY.md) for the full policy (required for Chrome
Web Store listing).

## License

[MIT](LICENSE)
