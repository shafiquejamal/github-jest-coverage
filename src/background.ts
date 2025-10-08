const notifyContentScript = (
  tabId: number,
  message: Record<string, unknown>
) => {
  chrome.tabs.sendMessage(tabId, message, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.debug("Unable to notify tab", tabId, error.message);
    }
  });
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  const url = changeInfo.url;
  if (!url || !url.includes("github.com")) {
    return;
  }

  notifyContentScript(tabId, {
    type: "url_update",
    url,
  });
});

chrome.webRequest.onCompleted.addListener(
  (details) => {
    notifyContentScript(details.tabId, {
      type: "url_request",
      url: details.url,
    });
  },
  { urls: ["https://github.com/*"] }
);
