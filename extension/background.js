// Meal Plan Stan - Background Service Worker
// Handles extension lifecycle events

chrome.runtime.onInstalled.addListener(() => {
  console.log("Meal Plan Stan extension installed");
});
