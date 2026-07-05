# Privacy Policy

CartLens does not collect, transmit, or sell any user data.

- All processing happens locally in your browser via a content script.
- No network requests are made by the extension.
- No analytics, telemetry, or third-party scripts are included.
- The extension only reads Amazon Cart pages (scoped via `host_permissions` to
  Amazon cart domains) to build the on-page table.
- CartLens stores a price history for your cart items **locally** on your device
  using the browser's `chrome.storage.local` API. This data never leaves your
  browser, is not synced to any server, and is used only to display each item's
  price history in the table. You can clear an item's history at any time using
  the clear (✕) button in the table, or by removing the extension.

If this policy ever changes (e.g., an optional feature is added that requires
network access), this file will be updated and the version history will make
the change auditable.
