// Meal Plan Stan - Background Service Worker
// Handles extension lifecycle and cart queue orchestration

chrome.runtime.onInstalled.addListener(() => {
  console.log("Meal Plan Stan extension installed");
});

// ── Cart Queue Orchestrator ──

let cartQueueRunning = false;
let cartQueueProgress = { current: 0, total: 0, results: [] };

let autoMatchRunning = false;
let autoMatchProgress = { current: 0, total: 0, results: [] };

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "startCartQueue") {
    if (cartQueueRunning) {
      sendResponse({ error: "Cart queue already running" });
      return;
    }
    startCartQueue();
    sendResponse({ started: true });
  }

  if (msg.action === "getCartProgress") {
    sendResponse({
      running: cartQueueRunning,
      ...cartQueueProgress,
    });
  }

  if (msg.action === "startAutoMatch") {
    if (autoMatchRunning) {
      sendResponse({ error: "Auto-match already running" });
      return;
    }
    if (cartQueueRunning) {
      sendResponse({ error: "Cart queue is running — wait for it to finish" });
      return;
    }
    startAutoMatch();
    sendResponse({ started: true });
  }

  if (msg.action === "getMatchProgress") {
    sendResponse({
      running: autoMatchRunning,
      ...autoMatchProgress,
    });
  }
});

async function startCartQueue() {
  cartQueueRunning = true;
  cartQueueProgress = { current: 0, total: 0, results: [] };

  try {
    const { apiKey, appUrl } = await chrome.storage.sync.get([
      "apiKey",
      "appUrl",
    ]);

    if (!apiKey || !appUrl) {
      cartQueueRunning = false;
      broadcastProgress({ error: "Extension not configured" });
      return;
    }

    // Fetch pending items from the API
    const res = await fetch(`${appUrl}/api/cart-queue/from-extension`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      cartQueueRunning = false;
      broadcastProgress({ error: "Failed to fetch cart queue" });
      return;
    }

    const { items } = await res.json();
    cartQueueProgress.total = items.length;

    if (items.length === 0) {
      cartQueueRunning = false;
      broadcastProgress({ done: true, message: "No pending items" });
      return;
    }

    const statusUpdates = [];

    // Process items sequentially
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      cartQueueProgress.current = i + 1;
      broadcastProgress();

      const result = await processItem(item);
      statusUpdates.push({
        id: item.id,
        status: result.success ? "added" : "failed",
        errorNote: result.reason || null,
      });

      cartQueueProgress.results.push({
        name: item.name,
        success: result.success,
        reason: result.reason,
        usedBackup: result.usedBackup || false,
      });

      // If OOS and had backup, the API will switch URLs — re-fetch and retry
      if (!result.success && result.reason === "oos" && item.walmartUrlBackup && !item.usedBackup) {
        // Report OOS to API — it will switch to backup URL
        await fetch(`${appUrl}/api/cart-queue/from-extension`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            updates: [{ id: item.id, status: "failed", errorNote: "oos" }],
          }),
        });

        // Try with backup URL
        const backupResult = await processItem({
          ...item,
          walmartUrl: item.walmartUrlBackup,
        });

        // Override the status update
        statusUpdates[statusUpdates.length - 1] = {
          id: item.id,
          status: backupResult.success ? "added" : "failed",
          errorNote: backupResult.success ? null : backupResult.reason,
        };

        cartQueueProgress.results[cartQueueProgress.results.length - 1] = {
          name: item.name,
          success: backupResult.success,
          reason: backupResult.reason,
          usedBackup: true,
        };
      }

      // Delay between items to avoid bot detection
      if (i < items.length - 1) {
        await sleep(3000 + Math.random() * 2000);
      }
    }

    // Batch report statuses back to the API
    await fetch(`${appUrl}/api/cart-queue/from-extension`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ updates: statusUpdates }),
    });

    cartQueueRunning = false;
    broadcastProgress({ done: true });
  } catch (err) {
    console.error("Cart queue error:", err);
    cartQueueRunning = false;
    broadcastProgress({ error: err.message });
  }
}

// ── Auto-Match Orchestrator ──
// For every queue item with no Walmart link: search walmart.ca, scrape the
// top results, then let the app pick the best product for each.

async function startAutoMatch() {
  autoMatchRunning = true;
  autoMatchProgress = { current: 0, total: 0, results: [] };

  try {
    const { apiKey, appUrl } = await chrome.storage.sync.get([
      "apiKey",
      "appUrl",
    ]);

    if (!apiKey || !appUrl) {
      autoMatchRunning = false;
      broadcastMatchProgress({ error: "Extension not configured" });
      return;
    }

    const res = await fetch(`${appUrl}/api/walmart/match`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      autoMatchRunning = false;
      broadcastMatchProgress({ error: "Failed to fetch unmatched items" });
      return;
    }

    const { items } = await res.json();
    autoMatchProgress.total = items.length;

    if (items.length === 0) {
      autoMatchRunning = false;
      broadcastMatchProgress({ done: true, message: "Nothing to match" });
      return;
    }

    const scraped = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      autoMatchProgress.current = i + 1;
      broadcastMatchProgress();

      const candidates = await scrapeSearch(item.searchUrl);
      scraped.push({ id: item.id, candidates });

      // Same pacing as the cart run — search pages are rate-limited too
      if (i < items.length - 1) {
        await sleep(3000 + Math.random() * 2000);
      }
    }

    // Hand every item to the app at once — one Claude call for the whole list
    const matchRes = await fetch(`${appUrl}/api/walmart/match`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: scraped }),
    });

    if (!matchRes.ok) {
      const detail = await matchRes.text();
      autoMatchRunning = false;
      broadcastMatchProgress({
        error: `Matching failed: ${detail.slice(0, 120)}`,
      });
      return;
    }

    const summary = await matchRes.json();
    autoMatchProgress.results = summary.results || [];

    autoMatchRunning = false;
    broadcastMatchProgress({
      done: true,
      matched: summary.matched,
      unmatched: summary.unmatched,
    });
  } catch (err) {
    console.error("Auto-match error:", err);
    autoMatchRunning = false;
    broadcastMatchProgress({ error: err.message });
  }
}

async function scrapeSearch(searchUrl) {
  let tab;
  try {
    tab = await chrome.tabs.create({ url: searchUrl, active: false });
    await waitForTabLoad(tab.id);

    // Search results hydrate client-side — give them a moment
    await sleep(2500);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["search-scraper.js"],
    });

    return results?.[0]?.result?.candidates ?? [];
  } catch (err) {
    console.error("Error scraping search:", searchUrl, err);
    return [];
  } finally {
    if (tab?.id) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch (_) {
        // Tab may already be closed
      }
    }
  }
}

function broadcastMatchProgress(extra = {}) {
  chrome.runtime
    .sendMessage({
      type: "matchProgress",
      ...autoMatchProgress,
      ...extra,
    })
    .catch(() => {
      // Popup may be closed
    });
}

async function processItem(item) {
  return new Promise(async (resolve) => {
    let tab;
    try {
      // Open the Walmart product page in a new tab
      tab = await chrome.tabs.create({
        url: item.walmartUrl,
        active: false,
      });

      // Wait for the tab to finish loading
      await waitForTabLoad(tab.id);

      // Give the page extra time to render dynamic content
      await sleep(2000);

      // Inject the cart-injector script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["cart-injector.js"],
      });

      const result = results?.[0]?.result || {
        success: false,
        reason: "no_result",
      };
      resolve(result);
    } catch (err) {
      console.error("Error processing item:", item.name, err);
      resolve({ success: false, reason: "tab_error" });
    } finally {
      // Close the tab
      if (tab?.id) {
        try {
          await chrome.tabs.remove(tab.id);
        } catch (_) {
          // Tab may already be closed
        }
      }
    }
  });
}

function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Tab load timeout"));
    }, 30000);

    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

function broadcastProgress(extra = {}) {
  chrome.runtime
    .sendMessage({
      type: "cartProgress",
      ...cartQueueProgress,
      ...extra,
    })
    .catch(() => {
      // Popup may be closed
    });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
