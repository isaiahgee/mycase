(function() {
    'use strict';

    // Filter to only react on Trello pages.  Listener filter and tab.query filter use different formats.
    const trelloHost = 'trello.com';
    const trelloFilter = { url: [{ hostEquals: trelloHost }] };
    const trelloQueryInfo = { url: '*://' + trelloHost + '/*' };
    const boardSummaryReleaseNotesUrl = 'https://twitter.com/boardsummaryapp';

    function onPageLoad(details) {
        // Show extension icon when on Trello page.  Don't need to run startProcessBoardTimer 
        // since it is run on page load with injected script.
        chrome.pageAction.show(details.tabId);
    }

    function onHistoryUpdated(details) {
        // Process boards on history change, which is the standard Trello page change trigger.
        processPage(details.tabId);
    }

    function refreshTrelloTabs() {
        // When settings changed, re-process board summary to reflect updates.  See issue #5.
        chrome.tabs.query(trelloQueryInfo, function(tabs) {
            if (tabs.length > 0) {
                tabs.forEach(function(tab) {
                    processPage(tab.id);
                });
            }
        });
    }

    function processPage(tabId) {
        chrome.tabs.executeScript(tabId, {code: 'if (typeof(boardSummary) !== \'undefined\') boardSummary.start(false);'});
    }

    function onExtensionInstalled(details) {
        if (details.reason === 'install' || details.reason === 'update') {
            chrome.tabs.create({url: boardSummaryReleaseNotesUrl});
        }
    }

    chrome.webNavigation.onCompleted.addListener(onPageLoad, trelloFilter);
    chrome.webNavigation.onHistoryStateUpdated.addListener(onHistoryUpdated, trelloFilter);
    chrome.storage.onChanged.addListener(refreshTrelloTabs);
    chrome.runtime.onInstalled.addListener(onExtensionInstalled);
})();
