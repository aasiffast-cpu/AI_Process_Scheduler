// AI Process Scheduler - Background Service Worker
// Author: Muhammad Asif

chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Process Scheduler Extension installed successfully.");
});

// Listen for messages if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open_full_tab") {
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
    sendResponse({ status: "opened" });
  }
  return true;
});
