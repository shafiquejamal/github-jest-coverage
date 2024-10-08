console.log("background script loaded")
chrome.tabs.onUpdated.addListener(
    function(tabId, changeInfo, tab) {
      // read changeInfo data and do something with it
      // like send the new url to contentscripts.js
      if (changeInfo.url && changeInfo.url.indexOf("github.com") >= 0) {
        try {
            chrome.tabs.sendMessage(tabId, {
                type: 'url_update',
                url: changeInfo.url
            })
        } catch(err) {}
      }
    }
); 