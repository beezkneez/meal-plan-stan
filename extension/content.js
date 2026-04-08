// Meal Plan Stan - Walmart.ca Content Script
// Injects "Add to Pantry" button on product pages

(function () {
  "use strict";

  let button = null;

  function getProductInfo() {
    // Extract product name from the page title or heading
    const titleEl =
      document.querySelector('[data-testid="product-title"]') ||
      document.querySelector("h1.lh-copy") ||
      document.querySelector("h1");
    const name = titleEl?.textContent?.trim() || document.title.split(" - ")[0];

    // Extract price
    const priceEl =
      document.querySelector('[data-testid="price-value"]') ||
      document.querySelector('[itemprop="price"]') ||
      document.querySelector(".price-characteristic");
    let price = null;
    if (priceEl) {
      const priceText =
        priceEl.getAttribute("content") || priceEl.textContent || "";
      const match = priceText.match(/[\d]+[.,]?\d*/);
      if (match) price = parseFloat(match[0].replace(",", "."));
    }

    // Product URL (clean, no query params)
    const url = window.location.origin + window.location.pathname;

    return { name, price, url };
  }

  function createButton() {
    if (button) return;

    button = document.createElement("div");
    button.id = "mps-add-to-pantry";
    button.innerHTML = `
      <button id="mps-btn" title="Add to Meal Plan Stan Pantry">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
          <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
          <path d="M12 3v6"/>
        </svg>
        <span>Add to Pantry</span>
      </button>
      <div id="mps-status" style="display:none;"></div>
    `;

    document.body.appendChild(button);

    document.getElementById("mps-btn").addEventListener("click", handleAdd);
  }

  async function handleAdd() {
    const btn = document.getElementById("mps-btn");
    const status = document.getElementById("mps-status");
    btn.disabled = true;
    btn.classList.add("mps-loading");

    try {
      const product = getProductInfo();

      // Get settings from extension storage
      const settings = await chrome.storage.sync.get(["apiKey", "appUrl"]);

      if (!settings.apiKey || !settings.appUrl) {
        showStatus("Set up API key in extension popup first", "error");
        return;
      }

      const res = await fetch(`${settings.appUrl}/api/pantry/from-extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          name: product.name,
          url: product.url,
          price: product.price,
        }),
      });

      if (res.ok) {
        showStatus("Added to pantry!", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showStatus(data.error || "Failed to add", "error");
      }
    } catch (err) {
      showStatus("Connection failed", "error");
    } finally {
      btn.disabled = false;
      btn.classList.remove("mps-loading");
    }
  }

  function showStatus(message, type) {
    const status = document.getElementById("mps-status");
    status.textContent = message;
    status.className = `mps-status-${type}`;
    status.style.display = "block";
    setTimeout(() => {
      status.style.display = "none";
    }, 3000);
  }

  // Wait for page to be ready, then inject
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createButton);
  } else {
    createButton();
  }
})();
