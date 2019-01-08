(function() {
    'use strict';

    const defaultTimeout = 1500;

    function saveOptions() {
        let homeBoardSummary = document.getElementById('homeBoardSummary').checked;
        let nestedBoardSummary = document.getElementById('nestedBoardSummary').checked;
        let refreshTime = document.getElementById('refreshTime').value;
        let homePageWide = document.getElementById('homePageWide').checked;
        let lists = document.getElementById('lists').checked;
        let cards = document.getElementById('cards').checked;
        let checkItems = document.getElementById('checkItems').checked;
        let complete = document.getElementById('complete').checked;
        let pastDue = document.getElementById('pastDue').checked;
        let dueNow = document.getElementById('dueNow').checked;
        let dueToday = document.getElementById('dueToday').checked;
        let dueSoon = document.getElementById('dueSoon').checked;
        let dueSoonDays = document.getElementById('dueSoonDays').value;
        let dueComplete = document.getElementById('dueComplete').checked;
        let shortDueDate = document.getElementById('shortDueDate').checked;
        let boardIcon = document.getElementById('nestedBoardIcon').value;
        let cardLabels = document.getElementById('showCardLabels').checked;
        let cardBadges = document.getElementById('showCardBadges').checked;
        let cardDescription = document.getElementById('hideCardDescription').checked;
        let cardMembers = document.getElementById('showCardMembers').checked;
        chrome.storage.sync.set({
            showHomeBoardSummary: homeBoardSummary,
            showNestedBoardSummary: nestedBoardSummary,
            boardRefreshTime: refreshTime,
            boardsPageWide: homePageWide,
            showLists: lists,
            showCards: cards,
            showCheckItems: checkItems,
            showComplete: complete,
            showPastDue: pastDue,
            showDueNow: dueNow,
            showDueToday: dueToday,
            showDueSoon: dueSoon,
            dueSoonDays: dueSoonDays,
            showDueComplete: dueComplete,
            showShortDueDates: shortDueDate,
            nestedBoardIcon: boardIcon,
            showCardLabels: cardLabels,
            showCardBadges: cardBadges,
            hideCardDescription: cardDescription,
            showCardMembers: cardMembers
        }, function() {
            // Update status to let user know save complete
            let status = document.getElementById('status');
            status.textContent = 'Options saved.';
            setTimeout(function() {
                status.textContent = '';
            }, defaultTimeout);
        });
    }

    function restoreOptions() {
        chrome.storage.sync.get({
            showHomeBoardSummary: true,
            showNestedBoardSummary: true,
            boardRefreshTime: 5,
            boardsPageWide: true,
            showLists: true,
            showCards: true,
            showCheckItems: true,
            showComplete: false,
            showPastDue: true,
            showDueNow: true,
            showDueToday: true,
            showDueSoon: true,
            dueSoonDays: 7,
            showDueComplete: true,
            showShortDueDates: false,
            nestedBoardIcon: 'default',
            hideCardContent: null,
            showCardLabels: false,
            showCardBadges: false,
            hideCardDescription: true,
            showCardMembers: false
        }, function(items) {
            // Update to latest version of options
            updateOptions(items);

            document.getElementById('homeBoardSummary').checked = items.showHomeBoardSummary;
            document.getElementById('nestedBoardSummary').checked = items.showNestedBoardSummary;
            document.getElementById('refreshTime').value = items.boardRefreshTime;
            document.getElementById('homePageWide').checked = items.boardsPageWide;
            document.getElementById('lists').checked = items.showLists;
            document.getElementById('cards').checked = items.showCards;
            document.getElementById('checkItems').checked = items.showCheckItems;
            document.getElementById('complete').checked = items.showComplete;
            document.getElementById('pastDue').checked = items.showPastDue;
            document.getElementById('dueNow').checked = items.showDueNow;
            document.getElementById('dueToday').checked = items.showDueToday;
            document.getElementById('dueSoon').checked = items.showDueSoon;
            document.getElementById('dueSoonDays').value = items.dueSoonDays;
            document.getElementById('dueComplete').checked = items.showDueComplete;
            document.getElementById('shortDueDate').checked = items.showShortDueDates;
            document.getElementById('nestedBoardIcon').value = items.nestedBoardIcon;
            document.getElementById('showCardLabels').checked = items.showCardLabels;
            document.getElementById('showCardBadges').checked = items.showCardBadges;
            document.getElementById('hideCardDescription').checked = items.hideCardDescription;
            document.getElementById('showCardMembers').checked = items.showCardMembers;
            showCardBadgesChanged();
        });
    }

    function updateOptions(options) {
        // If hideCardContent has a value then the old options are being used, 
        // so update to the latest settings
        if (options.hideCardContent !== null) {
            if (!options.hideCardContent) {
                options.showCardLabels = true;
                options.showCardBadges = true;
                options.showCardMembers = true;
            }
    
            delete options.hideCardContent;
            chrome.storage.sync.set(options);
            chrome.storage.sync.remove('hideCardContent');            
        }
    }
    
    function showCardBadgesChanged() {
        document.getElementById('hideCardDescription').disabled = !document.getElementById('showCardBadges').checked;
    }

    document.addEventListener('DOMContentLoaded', restoreOptions);
    document.getElementById('showCardBadges').addEventListener('change', showCardBadgesChanged);
    document.getElementById('save').addEventListener('click', saveOptions);
})();
