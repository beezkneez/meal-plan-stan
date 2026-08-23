// ── Settings ──

chrome.storage.sync.get(["apiKey", "appUrl"], (data) => {
  if (data.appUrl) document.getElementById("appUrl").value = data.appUrl;
  if (data.apiKey) document.getElementById("apiKey").value = data.apiKey;

  // Enable action buttons if settings are configured
  if (data.appUrl && data.apiKey) {
    document.getElementById("startCart").disabled = false;
    document.getElementById("startMatch").disabled = false;
  }
});

document.getElementById("save").addEventListener("click", () => {
  const appUrl = document
    .getElementById("appUrl")
    .value.trim()
    .replace(/\/$/, "");
  const apiKey = document.getElementById("apiKey").value.trim();
  const status = document.getElementById("status");

  if (!appUrl || !apiKey) {
    status.textContent = "Both fields are required";
    status.className = "status error";
    return;
  }

  chrome.storage.sync.set({ apiKey, appUrl }, () => {
    status.textContent = "Settings saved!";
    status.className = "status success";
    document.getElementById("startCart").disabled = false;
    document.getElementById("startMatch").disabled = false;
    setTimeout(() => {
      status.className = "status";
    }, 2000);
  });
});

// ── Cart Queue ──

const startCartBtn = document.getElementById("startCart");
const progressBar = document.getElementById("progressBar");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const cartResults = document.getElementById("cartResults");
const cartStatus = document.getElementById("cartStatus");

// Check if cart queue is already running
chrome.runtime.sendMessage({ action: "getCartProgress" }, (response) => {
  if (response?.running) {
    startCartBtn.disabled = true;
    startCartBtn.textContent = "Adding items...";
    showProgress(response);
  }
});

startCartBtn.addEventListener("click", () => {
  startCartBtn.disabled = true;
  startCartBtn.textContent = "Starting...";
  cartStatus.className = "status";
  cartResults.className = "results";

  chrome.runtime.sendMessage({ action: "startCartQueue" }, (response) => {
    if (response?.error) {
      cartStatus.textContent = response.error;
      cartStatus.className = "status error";
      startCartBtn.disabled = false;
      startCartBtn.textContent = "Add Shopping List to Cart";
      return;
    }

    startCartBtn.textContent = "Adding items...";
    progressBar.className = "progress-bar active";
    progressText.className = "progress-text active";
  });
});

// Listen for progress updates from background script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "cartProgress") return;

  if (msg.error) {
    cartStatus.textContent = msg.error;
    cartStatus.className = "status error";
    resetCartButton();
    return;
  }

  if (msg.done) {
    progressBar.className = "progress-bar";
    progressText.className = "progress-text";

    if (msg.message) {
      cartStatus.textContent = msg.message;
      cartStatus.className = "status success";
    } else {
      showResults(msg.results || []);
    }

    resetCartButton();
    return;
  }

  showProgress(msg);
});

function showProgress(data) {
  if (data.total > 0) {
    progressBar.className = "progress-bar active";
    progressFill.style.width = `${(data.current / data.total) * 100}%`;
    progressText.className = "progress-text active";
    progressText.textContent = `Adding item ${data.current} of ${data.total}...`;
  }
}

function showResults(results) {
  const added = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const usedBackup = results.filter((r) => r.usedBackup).length;

  let html = "";
  if (added > 0) {
    html += `<span class="stat stat-added">${added} added</span>`;
  }
  if (usedBackup > 0) {
    html += `<span class="stat stat-backup">${usedBackup} used backup</span>`;
  }
  if (failed > 0) {
    html += `<span class="stat stat-failed">${failed} failed</span>`;
  }

  cartResults.innerHTML = html;
  cartResults.className = "results active";

  if (failed === 0) {
    cartStatus.textContent = "All items added to cart!";
    cartStatus.className = "status success";
  } else {
    cartStatus.textContent = `${failed} item(s) could not be added. Check the Cart Queue page.`;
    cartStatus.className = "status error";
  }
}

function resetCartButton() {
  startCartBtn.disabled = false;
  startCartBtn.textContent = "2. Add Shopping List to Cart";
}

// ── Auto-Match ──

const startMatchBtn = document.getElementById("startMatch");
const matchBar = document.getElementById("matchBar");
const matchFill = document.getElementById("matchFill");
const matchText = document.getElementById("matchText");
const matchResults = document.getElementById("matchResults");
const matchStatus = document.getElementById("matchStatus");

chrome.runtime.sendMessage({ action: "getMatchProgress" }, (response) => {
  if (response?.running) {
    startMatchBtn.disabled = true;
    startMatchBtn.textContent = "Searching...";
    showMatchProgress(response);
  }
});

startMatchBtn.addEventListener("click", () => {
  startMatchBtn.disabled = true;
  startMatchBtn.textContent = "Starting...";
  matchStatus.className = "status";
  matchResults.className = "results";

  chrome.runtime.sendMessage({ action: "startAutoMatch" }, (response) => {
    if (response?.error) {
      matchStatus.textContent = response.error;
      matchStatus.className = "status error";
      resetMatchButton();
      return;
    }

    startMatchBtn.textContent = "Searching...";
    matchBar.className = "progress-bar active";
    matchText.className = "progress-text active";
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "matchProgress") return;

  if (msg.error) {
    matchStatus.textContent = msg.error;
    matchStatus.className = "status error";
    resetMatchButton();
    return;
  }

  if (msg.done) {
    matchBar.className = "progress-bar";
    matchText.className = "progress-text";

    if (msg.message) {
      matchStatus.textContent = msg.message;
      matchStatus.className = "status success";
    } else {
      showMatchResults(msg);
    }

    resetMatchButton();
    return;
  }

  showMatchProgress(msg);
});

function showMatchProgress(data) {
  if (data.total > 0) {
    matchBar.className = "progress-bar active";
    matchFill.style.width = `${(data.current / data.total) * 100}%`;
    matchText.className = "progress-text active";
    matchText.textContent = `Searching item ${data.current} of ${data.total}...`;
  }
}

function showMatchResults(msg) {
  const matched = msg.matched ?? 0;
  const unmatched = msg.unmatched ?? 0;

  let html = "";
  if (matched > 0) {
    html += `<span class="stat stat-added">${matched} linked</span>`;
  }
  if (unmatched > 0) {
    html += `<span class="stat stat-failed">${unmatched} no match</span>`;
  }

  matchResults.innerHTML = html;
  matchResults.className = "results active";

  if (unmatched === 0 && matched > 0) {
    matchStatus.textContent = "All items linked — ready to add to cart.";
    matchStatus.className = "status success";
  } else if (unmatched > 0) {
    matchStatus.textContent = `${unmatched} item(s) had no good match. Link those by hand on the Cart Queue page.`;
    matchStatus.className = "status error";
  }
}

function resetMatchButton() {
  startMatchBtn.disabled = false;
  startMatchBtn.textContent = "1. Find Walmart Links";
}
