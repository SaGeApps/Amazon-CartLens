(function () {
  const CONTAINER_ID = "cpc-price-change-table-container";
  const STORAGE_KEY = "cartlens_history";
  const MAX_HISTORY = 50; // cap history points per item
  let sortKey = "percentChange";
  let sortDir = "asc";
  let lastSignature = null;
  let collapsed = false;
  const expandedAsins = new Set();
  // ASINs the user cleared this session; skipped on re-scrape so they don't
  // immediately reappear while the item is still in the cart DOM.
  const dismissedAsins = new Set();
  let latestRows = [];

  function parsePrice(text) {
    if (text == null) return null;
    const cleaned = String(text).replace(/[^0-9.,]/g, "").replace(/,/g, "");
    const value = parseFloat(cleaned);
    return Number.isFinite(value) ? value : null;
  }

  // Scrape every active + saved-for-later cart line item using Amazon's own
  // data-* attributes, which are more reliable than the visible price spans.
  function scrapeCartItems() {
    const results = [];
    const seen = new Set();
    const nodes = document.querySelectorAll("div[data-asin][data-itemtype]");

    nodes.forEach((el) => {
      const itemType = el.getAttribute("data-itemtype");
      if (itemType !== "active" && itemType !== "saved") return;

      const asin = (el.getAttribute("data-asin") || "").toUpperCase();
      if (!asin) return;

      const price = parsePrice(el.getAttribute("data-price"));
      if (price == null || price === 0) return; // 0 = unavailable / out of stock

      // Avoid double-counting if Amazon renders the same asin twice in a section.
      const key = itemType + ":" + asin;
      if (seen.has(key)) return;
      seen.add(key);

      const titleEl = el.querySelector(".sc-product-title");
      const linkEl = el.querySelector("a.sc-product-link, a.sc-product-title, a[href*='/gp/product/'], a[href*='/dp/']");
      const imgEl = el.querySelector("img.sc-product-image");
      const name = titleEl ? titleEl.textContent.trim().replace(/\s+/g, " ") : asin;
      const href = linkEl ? new URL(linkEl.getAttribute("href"), window.location.origin).href : null;
      const image = imgEl ? imgEl.getAttribute("src") : null;

      results.push({
        asin,
        name,
        url: href,
        image,
        section: itemType, // "active" | "saved"
        currentPrice: price,
      });
    });

    return results;
  }

  function readHistory() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(STORAGE_KEY, (data) => {
          resolve((data && data[STORAGE_KEY]) || {});
        });
      } catch (e) {
        resolve({});
      }
    });
  }

  function writeHistory(store) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [STORAGE_KEY]: store }, () => resolve());
      } catch (e) {
        resolve();
      }
    });
  }

  // Clear stored history for one product and drop it from the table. Dismissed
  // for the rest of the session so it doesn't re-appear while still in the cart.
  async function deleteItem(asin) {
    dismissedAsins.add(asin);
    expandedAsins.delete(asin);
    const store = await readHistory();
    if (store[asin]) {
      delete store[asin];
      await writeHistory(store);
    }
    latestRows = latestRows.filter((r) => r.asin !== asin);
    lastSignature = null; // force next scrape to re-render
    renderTable(latestRows);
  }

  // Merge current prices into stored history. Appends a new point only when the
  // price differs from the last recorded one. Rows are built from the union of
  // stored items and currently-scraped items, so items that were seen before but
  // aren't in the DOM yet (Saved-for-Later lazy-loads as you scroll) stay in the
  // table instead of disappearing.
  function mergeHistory(items, store) {
    const now = Date.now();
    const present = new Map(items.map((it) => [it.asin, it]));

    // 1) Fold the current scrape into storage.
    items.forEach((item) => {
      if (dismissedAsins.has(item.asin)) return; // user cleared it this session
      const prev = store[item.asin];
      const history = prev && Array.isArray(prev.history) ? prev.history.slice() : [];
      const last = history.length ? history[history.length - 1] : null;

      if (!last || last.price !== item.currentPrice) {
        history.push({ price: item.currentPrice, t: now });
        if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
      }

      store[item.asin] = {
        name: item.name,
        url: item.url,
        image: item.image || (prev && prev.image) || null,
        section: item.section,
        history,
        lastSeen: now,
      };
    });

    // 2) Build rows from everything we know about (union of stored + present).
    const rows = [];
    Object.keys(store).forEach((asin) => {
      const rec = store[asin];
      const history = Array.isArray(rec.history) ? rec.history : [];
      if (history.length === 0) return;

      const live = present.get(asin);
      const currentPrice = history[history.length - 1].price;
      const previousPrice = history.length > 1 ? history[history.length - 2].price : null;

      const changed = previousPrice != null && previousPrice !== currentPrice;
      const percentChange =
        changed && previousPrice !== 0
          ? ((currentPrice - previousPrice) / previousPrice) * 100
          : 0;

      rows.push({
        asin,
        name: rec.name || asin,
        url: rec.url || null,
        image: rec.image || null,
        section: rec.section || "saved",
        oldPrice: previousPrice, // null for first-seen items
        newPrice: currentPrice,
        percentChange,
        changed,
        present: Boolean(live),
        history,
      });
    });

    return rows;
  }

  function formatPrice(value) {
    if (value == null) return "—";
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercent(value) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }

  function formatDate(t) {
    try {
      return new Date(t).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  }

  function buildTable(rows) {
    const wrapper = document.createElement("div");
    wrapper.id = CONTAINER_ID;
    wrapper.className = "cpc-wrapper";

    const changedCount = rows.filter((r) => r.changed).length;
    const heading = document.createElement("h3");
    heading.className = "cpc-heading";
    heading.setAttribute("role", "button");
    heading.setAttribute("tabindex", "0");
    heading.setAttribute("aria-expanded", String(!collapsed));

    const caret = document.createElement("span");
    caret.className = "cpc-collapse-caret";
    caret.textContent = collapsed ? "▸" : "▾";
    const headingText = document.createElement("span");
    headingText.textContent = `CartLens — Price Tracker (${rows.length} items, ${changedCount} changed)`;
    heading.append(caret, headingText);

    const toggleCollapse = () => {
      collapsed = !collapsed;
      renderTable(rows);
    };
    heading.addEventListener("click", toggleCollapse);
    heading.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleCollapse();
      }
    });
    wrapper.appendChild(heading);

    if (collapsed) {
      wrapper.classList.add("cpc-collapsed");
      return wrapper; // table body omitted while collapsed
    }

    const table = document.createElement("table");
    table.className = "cpc-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const columns = [
      { key: "name", label: "Product" },
      { key: "section", label: "Section" },
      { key: "oldPrice", label: "Prev Price" },
      { key: "newPrice", label: "Current Price" },
      { key: "percentChange", label: "% Change" },
    ];
    columns.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col.label;
      th.dataset.key = col.key;
      if (col.key === sortKey) {
        th.classList.add(sortDir === "asc" ? "cpc-sorted-asc" : "cpc-sorted-desc");
      }
      th.addEventListener("click", () => {
        if (sortKey === col.key) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortKey = col.key;
          sortDir = "asc";
        }
        renderTable(rows);
      });
      headRow.appendChild(th);
    });
    const clearTh = document.createElement("th");
    clearTh.className = "cpc-clear-col";
    clearTh.setAttribute("aria-label", "Clear");
    headRow.appendChild(clearTh);
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const sorted = [...rows].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (av == null) av = sortDir === "asc" ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === "asc" ? Infinity : -Infinity;
      if (typeof av === "string" && typeof bv === "string") {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });

    sorted.forEach((item) => {
      const tr = document.createElement("tr");
      tr.className = "cpc-row" + (item.changed ? "" : " cpc-unchanged");

      const nameTd = document.createElement("td");
      nameTd.className = "cpc-name";
      const toggle = document.createElement("span");
      toggle.className = "cpc-toggle";
      toggle.textContent = expandedAsins.has(item.asin) ? "▾ " : "▸ ";
      nameTd.appendChild(toggle);
      if (item.image) {
        const thumb = document.createElement("img");
        thumb.className = "cpc-thumb";
        thumb.src = item.image;
        thumb.alt = "";
        thumb.loading = "lazy";
        nameTd.appendChild(thumb);
      }
      if (item.url) {
        const a = document.createElement("a");
        a.href = item.url;
        a.textContent = item.name;
        a.target = "_self";
        a.rel = "noopener";
        a.addEventListener("click", (e) => e.stopPropagation());
        nameTd.appendChild(a);
      } else {
        nameTd.appendChild(document.createTextNode(item.name));
      }

      const sectionTd = document.createElement("td");
      sectionTd.className = "cpc-section";
      const sectionLabel = item.section === "saved" ? "Saved" : "Cart";
      sectionTd.textContent = item.present ? sectionLabel : sectionLabel + " (not on page)";
      if (!item.present) sectionTd.classList.add("cpc-absent");

      const oldTd = document.createElement("td");
      oldTd.className = "cpc-num";
      oldTd.textContent = formatPrice(item.oldPrice);

      const newTd = document.createElement("td");
      newTd.className = "cpc-num";
      newTd.textContent = formatPrice(item.newPrice);

      const pctTd = document.createElement("td");
      pctTd.className =
        "cpc-num " +
        (!item.changed ? "cpc-flat" : item.percentChange > 0 ? "cpc-increase" : "cpc-decrease");
      pctTd.textContent = item.changed ? formatPercent(item.percentChange) : "—";

      const clearTd = document.createElement("td");
      clearTd.className = "cpc-clear-cell";
      const clearBtn = document.createElement("button");
      clearBtn.className = "cpc-clear-btn";
      clearBtn.type = "button";
      clearBtn.textContent = "✕";
      clearBtn.title = "Clear this product's history and remove it from the table";
      clearBtn.setAttribute("aria-label", "Clear " + item.name);
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteItem(item.asin);
      });
      clearTd.appendChild(clearBtn);

      tr.append(nameTd, sectionTd, oldTd, newTd, pctTd, clearTd);

      // Click row (except the product link) to expand full price history.
      tr.addEventListener("click", () => {
        if (expandedAsins.has(item.asin)) expandedAsins.delete(item.asin);
        else expandedAsins.add(item.asin);
        renderTable(rows);
      });
      tbody.appendChild(tr);

      if (expandedAsins.has(item.asin)) {
        const historyTr = document.createElement("tr");
        historyTr.className = "cpc-history-row";
        const td = document.createElement("td");
        td.colSpan = 6;
        td.appendChild(buildHistoryPanel(item));
        historyTr.appendChild(td);
        tbody.appendChild(historyTr);
      }
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  function buildHistoryPanel(item) {
    const panel = document.createElement("div");
    panel.className = "cpc-history";

    if (!item.history || item.history.length === 0) {
      panel.textContent = "No price history recorded yet.";
      return panel;
    }

    const title = document.createElement("div");
    title.className = "cpc-history-title";
    title.textContent = "Price history";
    panel.appendChild(title);

    const list = document.createElement("ul");
    list.className = "cpc-history-list";
    // Newest first.
    [...item.history].reverse().forEach((point, idx, arr) => {
      const li = document.createElement("li");
      const priceSpan = document.createElement("span");
      priceSpan.className = "cpc-history-price";
      priceSpan.textContent = formatPrice(point.price);
      const dateSpan = document.createElement("span");
      dateSpan.className = "cpc-history-date";
      dateSpan.textContent = formatDate(point.t);
      li.append(priceSpan, dateSpan);
      list.appendChild(li);
    });
    panel.appendChild(list);
    return panel;
  }

  function renderTable(rows) {
    const existing = document.getElementById(CONTAINER_ID);
    const newWrapper = buildTable(rows);
    if (existing) {
      existing.replaceWith(newWrapper);
    } else {
      insertWrapper(newWrapper);
    }
  }

  function insertWrapper(wrapper) {
    const anchor =
      document.getElementById("cart-important-message-box") ||
      document.getElementById("sc-active-cart") ||
      document.getElementById("sc-page-content");
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(wrapper, anchor);
    } else {
      document.body.insertBefore(wrapper, document.body.firstChild);
    }
  }

  // Signature of the current scrape so we skip redundant storage writes/renders.
  function signatureOf(items) {
    return items
      .map((i) => `${i.section}:${i.asin}:${i.currentPrice}`)
      .sort()
      .join("|");
  }

  async function tryRender() {
    const items = scrapeCartItems();

    if (items.length === 0) {
      const existing = document.getElementById(CONTAINER_ID);
      if (existing) existing.remove();
      lastSignature = "";
      return;
    }

    const sig = signatureOf(items);
    if (sig === lastSignature && document.getElementById(CONTAINER_ID)) return;
    lastSignature = sig;

    const store = await readHistory();
    const rows = mergeHistory(items, store);
    await writeHistory(store);
    latestRows = rows;
    renderTable(rows);
  }

  tryRender();

  const observer = new MutationObserver(() => {
    clearTimeout(window.__cpcDebounce);
    window.__cpcDebounce = setTimeout(tryRender, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.type === "SCRAPE_PRICE_CHANGES") {
      sendResponse({ items: scrapeCartItems() });
    }
    return true;
  });
})();
