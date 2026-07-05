(function () {
  const CONTAINER_ID = "cpc-price-change-table-container";
  let sortKey = "percentChange";
  let sortDir = "asc";
  let lastRenderedCount = -1;

  function parsePrice(text) {
    if (!text) return null;
    const cleaned = text.replace(/[^0-9.,]/g, "").replace(/,/g, "");
    const value = parseFloat(cleaned);
    return Number.isFinite(value) ? value : null;
  }

  function scrapePriceChanges() {
    const results = [];
    const messages = document.querySelectorAll('[data-feature-id="single-imb-message"]');

    messages.forEach((msgEl) => {
      const typeInput = msgEl.parentElement
        ? msgEl.parentElement.querySelector('input[name="imb-type"]')
        : null;
      const type = typeInput ? typeInput.value : null;
      if (type !== "priceDecrease" && type !== "priceIncrease") return;

      const link = msgEl.querySelector("a[href]");
      const priceSpans = msgEl.querySelectorAll(".sc-product-price");
      if (!link || priceSpans.length < 2) return;

      const name = link.textContent.trim();
      const href = new URL(link.getAttribute("href"), window.location.origin).href;
      const oldPrice = parsePrice(priceSpans[0].textContent);
      const newPrice = parsePrice(priceSpans[1].textContent);
      if (oldPrice == null || newPrice == null || oldPrice === 0) return;

      const percentChange = ((newPrice - oldPrice) / oldPrice) * 100;

      results.push({ name, url: href, oldPrice, newPrice, percentChange });
    });

    return results;
  }

  function formatPrice(value) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercent(value) {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  }

  function buildTable(items) {
    const wrapper = document.createElement("div");
    wrapper.id = CONTAINER_ID;
    wrapper.className = "cpc-wrapper";

    const heading = document.createElement("h3");
    heading.className = "cpc-heading";
    heading.textContent = `Cart Price Changes (${items.length})`;
    wrapper.appendChild(heading);

    const table = document.createElement("table");
    table.className = "cpc-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const columns = [
      { key: "name", label: "Product" },
      { key: "oldPrice", label: "Old Price" },
      { key: "newPrice", label: "New Price" },
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
        renderTable(items);
      });
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const sorted = [...items].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (typeof av === "string") {
        av = av.toLowerCase();
        bv = bv.toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });

    sorted.forEach((item) => {
      const tr = document.createElement("tr");

      const nameTd = document.createElement("td");
      nameTd.className = "cpc-name";
      const a = document.createElement("a");
      a.href = item.url;
      a.textContent = item.name;
      nameTd.appendChild(a);

      const oldTd = document.createElement("td");
      oldTd.className = "cpc-num";
      oldTd.textContent = formatPrice(item.oldPrice);

      const newTd = document.createElement("td");
      newTd.className = "cpc-num";
      newTd.textContent = formatPrice(item.newPrice);

      const pctTd = document.createElement("td");
      pctTd.className = "cpc-num " + (item.percentChange > 0 ? "cpc-increase" : "cpc-decrease");
      pctTd.textContent = formatPercent(item.percentChange);

      tr.append(nameTd, oldTd, newTd, pctTd);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  function renderTable(items) {
    const existing = document.getElementById(CONTAINER_ID);
    const newWrapper = buildTable(items);
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

  function tryRender() {
    const items = scrapePriceChanges();
    if (items.length === 0) {
      const existing = document.getElementById(CONTAINER_ID);
      if (existing) existing.remove();
      lastRenderedCount = 0;
      return;
    }
    if (items.length === lastRenderedCount && document.getElementById(CONTAINER_ID)) {
      return;
    }
    lastRenderedCount = items.length;
    renderTable(items);
  }

  tryRender();

  const observer = new MutationObserver(() => {
    clearTimeout(window.__cpcDebounce);
    window.__cpcDebounce = setTimeout(tryRender, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.type === "SCRAPE_PRICE_CHANGES") {
      sendResponse({ items: scrapePriceChanges() });
    }
    return true;
  });
})();
