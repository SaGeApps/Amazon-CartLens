let items = [];
let sortKey = "percentChange";
let sortDir = "asc"; // asc = most negative (biggest decrease) first

const statusEl = document.getElementById("status");
const tbody = document.getElementById("price-table-body");
const headers = document.querySelectorAll("#price-table thead th");

function formatPrice(value) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function render() {
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

  tbody.innerHTML = "";
  sorted.forEach((item) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.className = "name";
    const a = document.createElement("a");
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = item.name;
    nameTd.appendChild(a);

    const oldTd = document.createElement("td");
    oldTd.className = "num";
    oldTd.textContent = formatPrice(item.oldPrice);

    const newTd = document.createElement("td");
    newTd.className = "num";
    newTd.textContent = formatPrice(item.newPrice);

    const pctTd = document.createElement("td");
    pctTd.className = "num " + (item.percentChange > 0 ? "increase" : "decrease");
    pctTd.textContent = formatPercent(item.percentChange);

    tr.append(nameTd, oldTd, newTd, pctTd);
    tbody.appendChild(tr);
  });

  headers.forEach((th) => {
    th.classList.remove("sorted-asc", "sorted-desc");
    if (th.dataset.key === sortKey) {
      th.classList.add(sortDir === "asc" ? "sorted-asc" : "sorted-desc");
    }
  });
}

headers.forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.key;
    if (sortKey === key) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortKey = key;
      sortDir = "asc";
    }
    render();
  });
});

async function loadData() {
  statusEl.textContent = "Loading...";
  tbody.innerHTML = "";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !/amazon\./.test(tab.url)) {
    statusEl.textContent = "Open your Amazon Cart page to scan for price changes.";
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    const response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PRICE_CHANGES" });
    items = (response && response.items) || [];

    if (items.length === 0) {
      statusEl.textContent = 'No price change messages found. Make sure you are on the Cart page and it shows "Important messages for items in your Cart".';
    } else {
      statusEl.textContent = `${items.length} item(s) with price changes.`;
    }
    render();
  } catch (err) {
    statusEl.textContent = "Could not read the page. Make sure you are on an Amazon Cart page and reload it, then try again.";
    console.error(err);
  }
}

document.getElementById("refresh").addEventListener("click", loadData);
loadData();
