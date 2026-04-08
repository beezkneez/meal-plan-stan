// Load saved settings
chrome.storage.sync.get(["apiKey", "appUrl"], (data) => {
  if (data.appUrl) document.getElementById("appUrl").value = data.appUrl;
  if (data.apiKey) document.getElementById("apiKey").value = data.apiKey;
});

document.getElementById("save").addEventListener("click", () => {
  const appUrl = document.getElementById("appUrl").value.trim().replace(/\/$/, "");
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
    setTimeout(() => {
      status.className = "status";
    }, 2000);
  });
});
