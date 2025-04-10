chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed");
});

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("index.html"),
    });
});
