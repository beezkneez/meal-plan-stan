// ── Settings ──

chrome.storage.sync.get(["apiKey", "appUrl"], (data) => {
  if (data.appUrl) document.getElementById("appUrl").value = data.appUrl;
  if (data.apiKey) document.getElementById("apiKey").value = data.apiKey;

  // Enable cart button if settings are configured
  if (data.appUrl && data.apiKey) {
    document.getElementById("startCart").disabled = false;
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
  startCartBtn.textContent = "Add Shopping List to Cart";
}
