var boardSummary = (function() {
    'use strict';

    const httpNotFoundResponse = 404;
    const httpUnauthorizedResponse = 401;
    const hoursToMilliseconds = 3600000;
    const totalPercent = 100;
    
    const config =  {
        settings: {
            newPageTimeout: 500, // Timeout for initial re-check for nested boards
            oneMinuteTimeout: 60000, // One minute in milliseconds
            parentTimeout: 30000, // Timeout for initial re-check for parent boards
            shortDebounceTimeout: 200, // Timeout for short duration debounced events
            longDebounceTimeout: 500, // Timeout for long duration debounced events
            trelloTimeout: 200, // Metering rate for processing lists for new boards to avoid Trello conflicts
            newBoardItemTimeout: 300, // Metering rate for processing checkitems for new boards to avoid Trello conflicts
            minPageRefreshTime: 2, // Minimum page refresh time, in minutes.
            boardCheckCounterMax: 2, // Max number of initial attempts to find nested boards
            parentCheckCounterMax: 2, // Max number of initial attempts to find a parent board
            popoverVerticalOffset: 6, // Used to set popover position
            popoverBorder: 2, // Used to set popover position
            trelloPosition: 65535, // Position increments for creating lists/cards on a new board
            requestBlockSize: 25, // Size of blocks to meter request rate
            requestBlockDelay: 35, // in ms, a value equal to requestBlockSize will force 100 requests to take 10 seconds, which is the Trello limit so something larger adds margin
            iconDefaultColor: 'blue', // Default nested board icon color
            iconNoLabelColor: 'null', // Nested board icon color if set to labels and no labels on card
            iconColors: ['default','label','green','yellow','orange','red','purple','blue','pink','sky','lime',
                'black','null','none'], // Valid icon colors
            dueNowHours: -36, // Must be negative, -36 hours is the Trello default
            dueTodayHours: 24  // Must be positive, 24 hours is the Trello default
        },
        trelloApi: {
            boardUrlPrefix: 'https://trello.com/b/',
            newBoardUrlPrefix: 'https://trello.com/board/',
            cardUrlPrefix: 'https://trello.com/c/',
            homeBoardsUrlRegex: 'https://trello.com/.*/boards',
            openBoardsUrl: 'https://trello.com/1/Members/me/boards?filter=open&fields=name,shortUrl,url&organization=true', // GET
            parentBoardsUrl: 'https://trello.com/1/search?query={0}&modelTypes=cards&card_fields=closed,desc&card_board=true&board_fields=name,url&dsc={1}', // GET
            boardDetailsUrl: 'https://trello.com/1/Boards/{0}?lists=open&cards=all&card_fields=badges,closed,dateLastActivity,desc,due,dueComplete,idList,name,shortUrl,url,labels&fields=name,closed,dateLastActivity', // GET
            cardDetailsUrl: 'https://trello.com/1/cards/{0}?fields=closed,dateLastActivity,desc,due,name,labels&list=true', // GET
            cardDetailsForNewBoardUrl: 'https://trello.com/1/card/{0}?checklists=all&checklist_fields=name,pos&board=true&board_fields=idOrganization,prefs&fields=desc,due,name', // GET
            createBoardUrl: 'https://trello.com/1/boards', // POST
            createListUrl: 'https://trello.com/1/boards/{0}/lists', // POST
            convertListItemToCardUrl: 'https://trello.com/1/cards/{0}/checklist/{1}/checkItem/{2}/convertToCard', // POST
            updateCardUrl: 'https://trello.com/1/cards/{0}', // PUT
            deleteChecklistUrl: 'https://trello.com/1/checklists/{0}', // DELETE
            updateChecklistUrl: 'https://trello.com/1/checklists/{0}', // PUT
            boardIdRegex: /https:\/\/trello.com\/b\/([^/]+)\/*(.)*/,
            cardIdRegex: /https:\/\/trello.com\/c\/([^/]+)\/*(.)*/,
            tokenRegex: /token=(.*?)(;|$)/,
            dscRegex: /dsc=(.*?)(;|$)/
        },
        CSS: {
            // Any item appended with 'ClassName' is only the CSS class name, not a selector 
            // (typically used with hasClass).  Anything else is a complete jQuery selector.
            trello: {
                boardSectionClassName: 'boards-page-board-section-header',
                listClassName: 'list-cards',
                card: '.list-card',
                cardNotPlaceholder: '.list-card:not(.placeholder)',
                description: '.icon-description',
                cardTitle: '.list-card-title',
                cardLabels: '.list-card-labels',
                cardBadges: '.badges',
                cardMembers: '.list-card-members',
                boardListClassName: 'boards-page-board-section-list',
                board: '.boards-page-board-section-list-item',
                boardLink: 'a.board-tile',
                addBoardLink: '.boards-page-board-section-list-item > .mod-add',
                boardDetailsName: '.board-tile-details-name',
                cardAddButtonContainer: '.card-detail-window .window-sidebar .button-link.js-change-card-members',
                popoverContainer: '.pop-over',
                popopverIsDisplayed: '.is-shown',
                popopverIsDisplayedClassName: 'is-shown',
                popoverCloseButton: '.pop-over-header-close-btn',
                cardDescriptionContainer: '.description-content',
                cardDescriptionLink: '.js-desc-content a.known-service-link',
                cardDescriptionEdit: '.js-edit-desc',
                cardDescriptionTextarea: '.card-detail-edit textarea',
                cardDescriptionSave: 'input.js-save-edit',
                boardHeader: '.js-board-header',
                cardDetailsWindowClassName: 'window-wrapper',
                cardDetailsContainer: '.card-detail-window',
                allBoardsContainer: '.all-boards'
            },
            boardSummary: {
                bst: '.bst',
                bstClassName: 'bst',
                container: '.bst.container',
                error: '.bst.error',
                boardIcon: '.bst.boardicon',
                cardEventNamespace: '.bst-card',
                homePageEventNamespace: '.bst-home',
                nestBoardButton: '.bst-make-nested-board',
                createBoardButton: '.bst-create-nested-board',
                popoverEventNamespace: '.bst-popover',
                popoverBoardList: '.bst.js-select-board',
                popoverSelectedBoardName: '.js-board-value',
                popoverBoardSelect: '.js-select-board',
                popoverSaveButton: '.js-submit',
                popoverOptions: '.bst-new-board-options',
                popoverUseSettings: '#bst-useSettings',
                popoverConvertChecklists: '#bst-convertChecklists',
                popoverDeleteChecklists: '#bst-deleteChecklists',
                parentContainer: '.bst-parentcontainer',
                parentLink: '.bst-parentlink',
                hideDescriptionClassName: 'bst-hideDesc',
                wideFormatBoardsClassName: 'bstWideFormat'
            }
        },
        HTML: {
            cardError: '<span class="bst error">Error retrieving card details</span>',
            boardSummaryError: '<span class="bst error">Error retrieving board summary</span>',
            nestedBoardButton: '<a class="button-link bst-make-nested-board" href="#"><span class="icon-sm icon-board"></span> Nested Board</a>'
        },
        errorMessages: {
            moveCardToBoardError: 'Error moving card "{0}" to new board',
            convertListItemToCardError: 'Error converting list item "{0}" to a card',
            createNewListError: 'Error creating new list "{0}"',
            createNewBoardError: 'Error creating new board',
            refreshCardError: 'Note: card window may show stale checklist data, close and re-open to update.',
            boardAccessUnauthorizedError: 'Board access unauthorized',
            boardNotFoundError: 'Board not found or deleted'
        },
        optionDefaults: {
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
        }
    };

    let globals = {
        userOptions: {},
        maxHeight: 0,
        boardCheckCounter: 0,
        timeoutID: 0,
        boardsFound: 0,
        boardsProcessed: 0,
        cardsFound: 0,
        cardsProcessed: 0,
        parentsProcessed: false,
        parentsFound: 0,
        parentCheckCounter: 0,
        errorCount: 0,
        pendingCards: [],
        pendingBoards: [],
        boardsByOrg: [],
        boardDetails: {},
        pageType: '',
        createBoard: {},
        processingPage: false,
        observerStarted: false,
        reprocessPage: false
    };

    // Debounce function based on http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
    // Confirms the function executes only once within the specified time interval regardless of the 
    // number of times called.
    const debounce = function(func, threshold, execNow) {
        let timeoutID = null;
        let timeout = threshold;

        if (!$.isNumeric(timeout)) {
            timeout = config.settings.shortDebounceTimeout;
        }

        return function debounced() {
            let obj = this;
            let args = arguments;

            function delayed() {
                if (!execNow) {
                    func.apply(obj, args);
                }
                timeoutID = null; 
            }

            if (timeoutID) {
                clearTimeout(timeoutID);
            }
            else if (execNow) {
                func.apply(obj, args);
            }
            timeoutID = setTimeout(delayed, timeout);
        };
    };

    // Trello only allows 100 requests every 10 seconds per token, so this determines a metering 
    // rate based on the number of requests, leaving some margin for other requests.  See issue #43.
    function getMeteredRate(requests) {
        return Math.ceil(requests / config.settings.requestBlockSize) * config.settings.requestBlockDelay;
    }

    // New array functions
    Array.prototype.pushUnique = function(element) {
        if (this.indexOf(element) === -1) {
            this.push(element);
        }
    };
    Array.prototype.pushUniqueValue = function(element) {
        let elementJson = JSON.stringify(element, Object.keys(element).sort());
        let found = false;
        for (let o of this) {
            if (elementJson === JSON.stringify(o, Object.keys(o).sort())) {
                found = true;
                break;
            }
        }
        if (!found) {
            this.push(element);
        }
    };
    Array.prototype.remove = function(element) {
        let index = this.indexOf(element);
        if (index !== -1) {
            this.splice(index, 1);
        }
    };

    // New string functions
    String.prototype.trimSlash = function() {
        let str = this;
        if (str.endsWith('/')) {
            return str.slice(0, -1);
        }
        else {
            return str;
        }
    };
    String.prototype.isBoardUrl = function() {
        return this.startsWith(config.trelloApi.boardUrlPrefix) || this.startsWith(config.trelloApi.newBoardUrlPrefix);
    };
    String.prototype.isCardUrl = function() {
        return this.startsWith(config.trelloApi.cardUrlPrefix);
    };
    String.prototype.isHomeBoardsUrl = function() {
        return this.match(config.trelloApi.homeBoardsUrlRegex);
    };

    // Enums
    const urlTypeEnum = {
        board: 'board',
        card: 'card'
    };
    const pageTypeEnum = {
        board: 'board',
        home: 'home'
    };

    function getApiUrlFromUrl(url, type) {
        let re, apiUrlTemplate;
        if (type === urlTypeEnum.board) {
            re = config.trelloApi.boardIdRegex;
            apiUrlTemplate = config.trelloApi.boardDetailsUrl;
        }
        else if (type === urlTypeEnum.card) {
            re = config.trelloApi.cardIdRegex;
            apiUrlTemplate = config.trelloApi.cardDetailsUrl;
        }
        else {
            return url.trimSlash() + '.json';
        }

        let id = url.replace(re, '$1');
        if (id !== url) {
            // If the regex matched and found the card/board ID, set the API url
            return apiUrlTemplate.replace('{0}', id);
        }
        else {
            // If no match found the original string is returned, so fall back to brute force method
            return url.trimSlash() + '.json';
        }
    }

    function getCardShortLinkFromUrl(url) {
        return getShortLinkFromUrl(url, config.trelloApi.cardIdRegex);
    }

    function getBoardShortLinkFromUrl(url) {
        return getShortLinkFromUrl(url, config.trelloApi.boardIdRegex);
    }

    function getShortLinkFromUrl(url, regex) {
        let shortLink = url.replace(regex, '$1');
        return (shortLink !== url) ? shortLink : null;
    }

    const setHomePageBoardHeight = debounce(function() {
        globals.maxHeight = 0;
        let boardElements = $(config.CSS.trello.board);

        if (boardElements.length > 0) {
            boardElements.each(function() {
                let a = $(this).children(config.CSS.trello.boardLink).first();

                // Update height of of boards and create new board link to be consistent
                if (a.height() > globals.maxHeight) {
                    globals.maxHeight = a.height();
                    boardElements.find(config.CSS.trello.boardLink).css('min-height', globals.maxHeight);
                    $(config.CSS.trello.addBoardLink).height(globals.maxHeight);
                }
            });
        }
    }, config.settings.shortDebounceTimeout, false);

    function processPage(reprocessPage) {
        // If page processing in progress then do not restart to avoid duplicate loops.  See issue #43.
        if (globals.processingPage) {
            // Set flag to reprocess page if required.  Covers case where page change occurs during 
            // page processing, and without this the new page is not processed.  See Issue #53.
            globals.reprocessPage = reprocessPage;
            return;
        }

        // Stop any existing timers and set page processing flag to prevent duplicate page processing
        clearTimeout(globals.timeoutID);
        globals.processingPage = true;

        // Reset max height each time since options or data may have changed
        globals.maxHeight = 0;

        // Need to track all async processes started and completed, so re-initialize counters for card and board requests
        globals.boardsFound = 0;
        globals.boardsProcessed = 0;
        globals.cardsFound = 0;
        globals.cardsProcessed = 0;
        globals.errorCount = 0;
        globals.parentsProcessed = false;
        globals.parentsFound = 0;
        globals.pendingCards = [];
        globals.pendingBoards = [];
        globals.boardDetails = {};
        globals.pageType = '';

        // Get user options, then process data in callback to ensure options have been retrieved
        chrome.storage.sync.get({
            showHomeBoardSummary: config.optionDefaults.showHomeBoardSummary,
            showNestedBoardSummary: config.optionDefaults.showNestedBoardSummary,
            boardRefreshTime: config.optionDefaults.boardRefreshTime,
            boardsPageWide: config.optionDefaults.boardsPageWide,
            showLists: config.optionDefaults.showLists,
            showCards: config.optionDefaults.showCards,
            showCheckItems: config.optionDefaults.showCheckItems,
            showComplete: config.optionDefaults.showComplete,
            showPastDue: config.optionDefaults.showPastDue,
            showDueNow: config.optionDefaults.showDueNow,
            showDueToday: config.optionDefaults.showDueToday,
            showDueSoon: config.optionDefaults.showDueSoon,
            dueSoonDays: config.optionDefaults.dueSoonDays,
            showDueComplete: config.optionDefaults.showDueComplete,
            showShortDueDates: config.optionDefaults.showShortDueDates,
            nestedBoardIcon: config.optionDefaults.nestedBoardIcon,
            hideCardContent: config.optionDefaults.hideCardContent,
            showCardLabels: config.optionDefaults.showCardLabels,
            showCardBadges: config.optionDefaults.showCardBadges,
            hideCardDescription: config.optionDefaults.hideCardDescription,
            showCardMembers: config.optionDefaults.showCardMembers
        }, function(items) {
            // Update to latest version of options
            updateOptions(items);

            // Validate nestedBoardIcon (set to default if invalid) and save options
            if (config.settings.iconColors.indexOf(items.nestedBoardIcon) === -1) {
                items.nestedBoardIcon = config.settings.defaultNestedBoardIcon;
            }
            globals.userOptions = items;

            // Ensure board refresh time is not less than the minimum value.  See issue #50.
            if (globals.userOptions.boardRefreshTime < config.settings.minPageRefreshTime) {
                globals.userOptions.boardRefreshTime = config.settings.minPageRefreshTime;
            }

            // For some reason the first request, and any others at the same time, are periodically 
            // stalled/canceled in Chrome, so initiate a request that can fail with no impacts, 
            // then wait for timeout to ensure the request succeeds or fails. See issue #50.
            getAllBoardJson();
            setTimeout(function() {
                // Remove all error messages when start page processing, otherwise in some cases they were never 
                // cleared when they should be. Fixes Issue #30.
                $(config.CSS.boardSummary.error).remove();

                if (document.location.href.isBoardUrl() || document.location.href.isCardUrl()) {
                    // Board or card page displayed, add summary to nested boards.
                    // Cards are included so board background pages are processed as well.
                    globals.pageType = pageTypeEnum.board;
                    if (globals.userOptions.showNestedBoardSummary) {
                        processAllCardsForNestedBoards();
                        displayParentBoardLinks();
                    }
                    else {
                        // If not showing nested board clear any currently displayed data to cover the 
                        // case where the options were changed.  See issue #5.
                        clearAllNestedBoards();
                        globals.processingPage = false;
                    }
                }
                else {  
                    // Otherwise assume it could be a Home page.
                    globals.pageType = pageTypeEnum.home;

                    // Check for home boards page, and if so apply/remove wide format setting
                    if (document.location.href.isHomeBoardsUrl()) {
                        let allBoardsContainer = $(config.CSS.trello.allBoardsContainer);
                        if (allBoardsContainer.length > 0) {
                            if (items.boardsPageWide) {
                                allBoardsContainer.addClass(config.CSS.boardSummary.wideFormatBoardsClassName);
                            }
                            else {
                                allBoardsContainer.removeClass(config.CSS.boardSummary.wideFormatBoardsClassName);
                            }
                        }
                    }   

                    if (globals.userOptions.showHomeBoardSummary) {
                        $(window).on('resize' + config.CSS.boardSummary.homePageEventNamespace, function() { 
                            setHomePageBoardHeight();
                        });

                        processAllHomePageBoards();
                    }
                    else {
                        // If not showing home page boards clear any currently displayed data to cover 
                        // the case where the options were changed.  See issue #5.
                        clearAllBoardSummaries();
                        globals.processingPage = false;
                    }
                }
            }, config.settings.trelloTimeout);
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

    function clearAllBoardSummaries() {
        $(config.CSS.boardSummary.container).remove();
    }

    function clearAllNestedBoards() {
        $(config.CSS.boardSummary.boardIcon).remove();
        $(config.CSS.boardSummary.container).remove();
        $(config.CSS.trello.cardLabels).removeAttr('style');
        $(config.CSS.trello.cardBadges).removeAttr('style');
        $(config.CSS.trello.cardMembers).removeAttr('style');
        $(config.CSS.trello.cardBadges).removeClass(config.CSS.boardSummary.hideDescriptionClassName);
        $(config.CSS.trello.cardTitle).off(config.CSS.boardSummary.cardEventNamespace);
        $(config.CSS.boardSummary.parentContainer).remove();
    }

    function processCardEditPopup() {
        // When card edit page is displayed, pull all board data so there's no delay when popover displayed
        getAllBoardJson();
        displayNestedBoardButton();
    }

    function getLoginToken() {
        return getValueFromCookie(config.trelloApi.tokenRegex);
    }

    function getDsc() {
        return getValueFromCookie(config.trelloApi.dscRegex);
    }

    function getValueFromCookie(regex) {
        let value = document.cookie.match(regex);
        return (value && decodeURIComponent(value[1])) || null;
    }

    function getNewBoardData(cardDetails, copyBoard) {
        let data = { name: cardDetails.name, defaultLists: false, token: getLoginToken() };
        if (cardDetails.desc !== '') {
            data.desc = cardDetails.desc;
        }
        if (copyBoard === true) {
            if (cardDetails.board.idOrganization !== null) {
                data.idOrganization = cardDetails.board.idOrganization;
            }
            let prefs = cardDetails.board.prefs; 
            if (prefs.background !== null) {
                data.prefs_background = prefs.background;
            }
            if (prefs.cardAging !== null) {
                data.prefs_cardAging = prefs.cardAging;
            }
            if (prefs.cardCovers !== null) {
                data.prefs_cardCovers = prefs.cardCovers;
            }
            if (prefs.comments !== null) {
                data.prefs_comments = prefs.comments;
            }
            if (prefs.invitations !== null) {
                data.prefs_invitations = prefs.invitations;
            }
            if (prefs.permissionLevel !== null) {
                data.prefs_permissionLevel = prefs.permissionLevel;
            }
            if (prefs.selfJoin !== null) {
                data.prefs_selfJoin = prefs.selfJoin;
            }
            if (prefs.voting !== null) {
                data.prefs_voting = prefs.voting;
            }
        }
        return data;
    }

    function GetCheckItemCount(card) {
        let count = 0;
        for (let i = 0; i < card.checklists.length; i++) {
            let checklist = card.checklists[i];
            for (let j = 0; j < checklist.checkItems.length; j++) {
                if (checklist.checkItems[j].state === 'incomplete') {
                    count++;
                }
            }
        }
        return count;
    }

    function convertCardToBoard(copyBoardSettings, convertChecklistsToListsCards, deleteEmptyChecklists) {
        // Reset counters
        globals.createBoard = { listsFound: 0, listsProcessed: 0, itemsFound: 0, itemsProcessed: 0 };

        // Get current card data, including current board data to create new board
        let shortLink = getCardShortLinkFromUrl(document.location.href);
        $.get(config.trelloApi.cardDetailsForNewBoardUrl.replace('{0}', shortLink), function(card) {
            let cardId = card.id;
            let newBoardData = getNewBoardData(card, copyBoardSettings);

            // Create new board
            $.post(config.trelloApi.createBoardUrl, newBoardData, function(newBoard) {
                let boardId = newBoard.id;  // Saved for use later for lists
                card.newBoardId = boardId;
                saveNestedBoard(newBoard.url);

                if (convertChecklistsToListsCards === true) {
                    // Sort to ensure lists are in the correct order
                    card.checklists.sort(function(list1, list2) {
                        return list1.pos - list2.pos;
                    });

                    // Stop page processing since there can be a lot of mutations when converting checkitems to cards and moving them.  
                    // Will restart at the end of processing.
                    stopPageProcessing();

                    let requestsPerItem = 2;
                    globals.createBoard.listsFound = card.checklists.length;
                    globals.createBoard.itemsFound = GetCheckItemCount(card);
                    let listTimeout = 0;
                    card.checklists.forEach(function(checkList, listIndex) {
                        // Found a bug in Trello where list requests being processed in parallel are completed, but sometimes the position values are lost, 
                        // so added this delay.  This was seen with both list creation and updates.  Have not seen this with card or checklist requests, 
                        // so it's only implemented here.  Have tested delays less than 200ms and still saw issues.  Trello is working the issue.
                        setTimeout(function() {
                            let loginToken = getLoginToken();
                            let newListData = { 
                                name: checkList.name, 
                                pos: (listIndex + 1) * config.settings.trelloPosition, 
                                token: loginToken };

                            // For each checklist, create a new list in the new board
                            $.post(config.trelloApi.createListUrl.replace('{0}', boardId), newListData, function(newList) {
                                let newListId = newList.id;
                                checkList.newListId = newListId;

                                // Sort to ensure items are in the correct order, typically they're returned in the order created
                                checkList.checkItems.sort(function(item1, item2) {
                                    return item1.pos - item2.pos;
                                });

                                // Convert each item to a card (which will be on the current board/list), 
                                // then move to new list on new board.  This retains the history in Trello.
                                checkList.checkItems.forEach(function(checkItem, itemIndex) {
                                    setTimeout(function() {
                                        // Only process list items if incomplete
                                        if (checkItem.state === 'incomplete') {
                                            let convertToCardUrl = config.trelloApi.convertListItemToCardUrl
                                                .replace('{0}', cardId)
                                                .replace('{1}', checkList.id)
                                                .replace('{2}', checkItem.id);
                                            let convertListItemToCardData = { token: loginToken };

                                            // Convert each list item to a card
                                            $.post(convertToCardUrl, convertListItemToCardData, function(newCard) {
                                                // Updated to use "_id" instead of "id" due to changes to Trello API. Fixes issue #36.
                                                // After notifying Trello they fixed the problem, so back to "id". Fixes issue #37.
                                                checkItem.newCardId = newCard.id;
                                                let moveCardToBoardData = { 
                                                    idBoard: boardId, 
                                                    idList: newListId, 
                                                    pos: (itemIndex + 1) * config.settings.trelloPosition, 
                                                    token: loginToken };

                                                // Move the list item card to the new board/list
                                                $.ajax({
                                                    method: 'PUT',
                                                    url: config.trelloApi.updateCardUrl.replace('{0}', checkItem.newCardId), 
                                                    data: moveCardToBoardData
                                                })
                                                    .fail(function() {
                                                        window.alert(config.errorMessages.moveCardToBoardError.replace('{0}', newCard.name));
                                                    })
                                                    .always(function() {
                                                        globals.createBoard.itemsProcessed++;
                                                        awaitNewBoardProcessed(card, deleteEmptyChecklists);
                                                    });
                                            })
                                                .fail(function() {
                                                    window.alert(config.errorMessages.convertListItemToCardError.replace('{0}', checkItem.name));
                                                });
                                        }
                                    // Offset timeout by index to avoid concurrent requests (see issue #105)
                                    }, config.settings.newBoardItemTimeout * requestsPerItem * itemIndex);
                                });
                            })
                                .fail(function() {
                                    window.alert(config.errorMessages.createNewListError.replace('{0}', checkList.name));
                                })
                                .always(function() {
                                    globals.createBoard.listsProcessed++;
                                    awaitNewBoardProcessed(card, deleteEmptyChecklists);
                                });
                        }, listTimeout);
                        // Offset timeout of next checklist by the total time required to process this checklist (see issue #105)
                        listTimeout += config.settings.newBoardItemTimeout * ((checkList.checkItems.length * requestsPerItem) + 1);
                    });
                }
            })
                .fail(function() {
                    window.alert(config.errorMessages.createNewBoardError);
                });
        });
    }

    function awaitNewBoardProcessed(originalCard, deleteEmptyChecklists) {
        // Don't need to confirm that CheckLists were moved since this method is only called in that case
        if (globals.createBoard.listsFound === globals.createBoard.listsProcessed && globals.createBoard.itemsFound === globals.createBoard.itemsProcessed) {
            let loginToken = getLoginToken();

            // Get updated card data to confirm state after items moved to new board
            $.get(config.trelloApi.cardDetailsForNewBoardUrl.replace('{0}', originalCard.id), function(card) {
                card.checklists.forEach(function(checkList) {
                    let listData;
                    // Delete checklist if empty and delete empty checklists selected
                    if (checkList.checkItems.length === 0 && deleteEmptyChecklists === true) {
                        listData = { token: loginToken };
                        $.ajax({
                            method: 'DELETE',
                            url: config.trelloApi.deleteChecklistUrl.replace('{0}', checkList.id), 
                            data: listData
                        })
                            .fail(function() {
                                window.alert('Error deleting CheckList "' + checkList.name + '"');
                            });
                    }
                    // Otherwise update checklists to refresh Trello UI
                    else {
                        listData = { name: checkList.name, token: loginToken };
                        $.ajax({
                            method: 'PUT',
                            url: config.trelloApi.updateChecklistUrl.replace('{0}', checkList.id), 
                            data: listData
                        })
                            .fail(function() {
                                window.alert(config.errorMessages.refreshCardError);
                            });
                    }
                });
            });

            // Restart mutation observer since stopped during nested board processing.
            startObserver();
        }
    }

    function displayNestedBoardButton() {
        // Generate button with click handler to display popover only if the button has not already been displayed
        if ($(config.CSS.boardSummary.nestBoardButton).length === 0) {
            let button = $(config.HTML.nestedBoardButton).click(function(e) {
                displayNestedBoardPopover(e);
                e.stopPropagation();
                return false;
            });

            // Add button to top of "Add" button list
            let description2 = $(config.CSS.trello.cardAddButtonContainer);
            if (description2.length > 0) {
                description2.before(button);
            }
            else {
                // If add button container not found, setTime to repeat this method until it is.  This typically takes an extra cycle 
                // when navigating directly to a card page.  Using debounce timer to display as quickly as possible to limit the visible UI changes.
                setTimeout(displayNestedBoardButton, config.settings.debounceTimeout);
            }
        }
    }

    const setPopoverPosition = debounce(function() {
        // Set ideal popover position (directly below button, left aligned) and adjust to
        // ensure it fits within the window.
        let container = $(config.CSS.trello.popoverContainer);
        let button = $(config.CSS.boardSummary.nestBoardButton);
        let popover = container.find(config.CSS.boardSummary.bst).first();
        let offset = button.offset();
        let win = $(window);
        let top = offset.top + button.outerHeight() + config.settings.popoverVerticalOffset;
        if (top + popover.outerHeight() + config.settings.popoverBorder > win.innerHeight()) {
            top = win.innerHeight() - popover.outerHeight() - config.settings.popoverBorder;
        }
        let left = offset.left;
        if (left + popover.outerWidth() + config.settings.popoverBorder > win.innerWidth()) {
            left = win.innerWidth() - popover.outerWidth() - config.settings.popoverBorder;
        }
        container.css('top', top);
        container.css('left', left);
    }, config.settings.shortDebounceTimeout, false);

    function displayNestedBoardPopover() {
        // Check if any popover is currently displayed
        let container = $(config.CSS.trello.popoverContainer);
        if (container.is(config.CSS.trello.popopverIsDisplayed)) {
            // Check if this popover is displayed (done here before popopver is closed)
            let isNestedBoardPopover = container.find(config.CSS.boardSummary.bst).length > 0;

            // Popover is shown, so find close button and click.  Doing this rather than just 
            // removing popover content keeps state clean for any Trello popovers.
            container.find(config.CSS.trello.popoverCloseButton).get(0).click();

            // If this popover is displayed, then do nothing after closing
            if (isNestedBoardPopover) {
                return false;
            }
        }
        else {
            // Clean up any residual popover data just in case something was left
            container.removeAttr('style');
            container.empty();
        }

        // Get rendered popover, add to page, and then add class to display
        let popover = getNestedBoardPopoverHTML();
        container.append(popover);
        container.addClass(config.CSS.trello.popopverIsDisplayedClassName);

        // Set popover position here since it has no height/width until visible
        setPopoverPosition();

        // Add handler to close if click anywhere outside popover
        $(document).on('click' + config.CSS.boardSummary.popoverEventNamespace, function(e) { 
            // If popover is shown
            if ($(config.CSS.trello.popoverContainer).is(config.CSS.trello.popopverIsDisplayed)) {
                let target = $(e.target);
                // If click is anywhere except popover or any of its descendants, close popover
                if (target.closest(config.CSS.trello.popoverContainer).length === 0 && !target.is(config.CSS.trello.popoverContainer)) {
                    hideNestedBoardPopover();
                    e.stopPropagation();
                    return false;
                }
            }        
        });

        // Add handler to adjust position if window resized
        $(window).on('resize' + config.CSS.boardSummary.popoverEventNamespace, function() { 
            // If popover is shown
            if ($(config.CSS.trello.popoverContainer).is(config.CSS.trello.popopverIsDisplayed)) {
                setPopoverPosition();
            }        
        });

        return false;
    }

    function hideNestedBoardPopover() {
        // Remove any handlers (entire namespace) to hide popover if clicking anywhere else on page
        $(document).off(config.CSS.boardSummary.popoverEventNamespace);
        $(window).off(config.CSS.boardSummary.popoverEventNamespace);

        // Remove any existing popopver content and reset popover container to its original state
        let container = $(config.CSS.trello.popoverContainer);
        container.removeClass(config.CSS.trello.popopverIsDisplayedClassName);
        container.removeAttr('style');
        container.empty();
    }

    function saveNestedBoard(boardUrl) {
        // Easiest way to save value and maintain Trello state is to perform the edit - click edit button, change text, click save
        let description = $(config.CSS.trello.cardDescriptionContainer);
        description.find(config.CSS.trello.cardDescriptionEdit).get(0).click();
        description.find(config.CSS.trello.cardDescriptionTextarea).get(0).value = boardUrl;
        description.find(config.CSS.trello.cardDescriptionSave).get(0).click();
    }

    function getCurrentNestedBoard() {
        // Return URL if card description currently contains a nested board link.
        let currentNestedBoard = '';
        let descriptionLink = $(config.CSS.trello.cardDescriptionLink);
        if (descriptionLink.length > 0) {
            let description = descriptionLink.get(0).href;
            if (description.length > 0 && description.isBoardUrl()) {
                currentNestedBoard = description;
            }
        }
        return currentNestedBoard;
    }

    function getNestedBoardPopoverHTML() {
        // Check card description to see if it currently contains a nested board link.
        // If so, this value should be selected on the popover.
        let currentNestedBoard = getCurrentNestedBoard();
        setSelectedBoard(globals.boardsByOrg, currentNestedBoard);

        // Get HTML from template
        let popover = $(Handlebars.templates.nestedBoardPopover(globals.boardsByOrg));

        // Add close button click handler
        popover.find(config.CSS.trello.popoverCloseButton).click(function(e) {
            hideNestedBoardPopover();
            e.stopPropagation();
            return false;
        });

        // Add select change handler
        popover.find(config.CSS.boardSummary.popoverBoardSelect).change(function() {
            let selected = $(this).find('option:selected').first(0);
            popover.find(config.CSS.boardSummary.popoverSelectedBoardName).get(0).innerText = selected.text();

            // Hide the create new board options if linking an existing board
            if (selected.val() === 'new') {
                popover.find(config.CSS.boardSummary.popoverOptions).removeClass('hidden');
            }
            else {
                popover.find(config.CSS.boardSummary.popoverOptions).addClass('hidden');
            }
        });

        // Add checkbox change handler
        popover.find(config.CSS.boardSummary.popoverConvertChecklists).change(function() {
            // Only make delete checklist available if converting checklists
            $(config.CSS.boardSummary.popoverDeleteChecklists).prop('disabled', !this.checked);
        });

        // Add save button handler
        popover.find(config.CSS.boardSummary.popoverSaveButton).click(function(e) {
            let board = popover.find('option:selected').first(0).val();
            if (board === 'new') {
                convertCardToBoard($(config.CSS.boardSummary.popoverUseSettings).is(':checked'), 
                    $(config.CSS.boardSummary.popoverConvertChecklists).is(':checked'),
                    $(config.CSS.boardSummary.popoverDeleteChecklists).is(':checked'));
            }
            else {
                saveNestedBoard(board);
            }
            hideNestedBoardPopover();
            e.stopPropagation();
            return false;
        });

        return popover;
    }

    function setSelectedBoard(boardSummaries, currentNestedBoard) {
        let boardFound = false;
        boardSummaries.selectedBoardName = '';
        boardSummaries.organizations.forEach(function(org) {
            org.boards.forEach(function(board) {
                // Set flag for selected board in template
                if (boardFound === false && (currentNestedBoard === board.url || currentNestedBoard === board.shortUrl)) {
                    board.selected = true;
                    boardFound = true;

                    // Save board name to set on button in template
                    boardSummaries.selectedBoardName = board.name;
                }
                else {
                    board.selected = false;
                }
            });
        });
        return;
    }

    function getAllBoardJson() {
        // Data is saved if retrieved.  If there is an error any previous data is not removed so at least the last valid values are available. 
        $.get(config.trelloApi.openBoardsUrl, function(data) {
            let boardSummaries = data;

            // Check that organization.displayName exists in all objects so a sort can be done.  An empty value ensures that
            // personal boards show up at the top of the list.
            boardSummaries.forEach(function(board) {
                if (!board.organization) {
                    board.organization = { displayName: ''};
                }
            });

            // Sort board summaries by organization (i.e. team) name and then board name
            boardSummaries.sort(function(a, b) {
                if (a.organization.displayName === b.organization.displayName) {
                    return ((a.name === b.name) ? 0 : ((a.name > b.name) ? 1 : -1));
                }
                else {
                    return ((a.organization.displayName > b.organization.displayName) ? 1 : -1);
                }
            });

            // Reshape data so grouped by organization, then by board (facilitated by previous sort)
            let orgs = { organizations: [] };
            let previousOrgName = 'foo';
            let currentOrg = {};
            boardSummaries.forEach(function(board) {
                if (previousOrgName !== board.organization.displayName) {
                    orgs.organizations.push({ name: board.organization.displayName || 'Personal', boards: []});
                    currentOrg = orgs.organizations[orgs.organizations.length - 1];
                    previousOrgName = board.organization.displayName;
                }

                currentOrg.boards.push(board);
            });

            globals.boardsByOrg = orgs;
        });
    }

    function compareByName(o1, o2) {
        return ((o1.name === o2.name) ? 0 : ((o1.name > o2.name) ? 1 : -1));
    }

    function getFilteredParentBoards(parentCards) {
        let parents = [];
        for (let card of parentCards) {
            if (!card.closed) {
                let board = { name: card.board.name, url: card.board.url };
                parents.pushUniqueValue(board);
            }
        }
        return parents.sort(compareByName);
    }
        
    function displayParentBoardLinks() {
        let boardId = getBoardShortLinkFromUrl(document.location.href);
        let dsc = getDsc();
        if (boardId !== null && dsc !== null) {
            $.get(config.trelloApi.parentBoardsUrl.replace('{0}', boardId).replace('{1}', dsc), function(data) {
                let nestedBoardCards = [];
                if (data.cards) {
                    nestedBoardCards = getFilteredParentBoards(data.cards);
                }

                // If open parent boards remain, add to display
                if (nestedBoardCards.length > 0) {
                    // Save number of parents found for use in await
                    globals.parentsFound = nestedBoardCards.length;

                    // Get parent board links HTML
                    let links = getParentBoardLinksHtml(nestedBoardCards);

                    // Replace existing parent board links container if it exists, otherwise add new
                    let header = $(config.CSS.trello.boardHeader).first();
                    if (header.find(config.CSS.boardSummary.parentContainer).length > 0) {
                        header.children(config.CSS.boardSummary.parentContainer).replaceWith(links);
                    }
                    else {
                        header.append(links);
                    }
                }
                // Otherwise remove parent container in case there were previously parent boards
                else {
                    $(config.CSS.boardSummary.parentContainer).remove();                    
                }
            })
                .always(function() {
                    // When AJAX requests is complete, set complete and check for all async tasks complete to set timer
                    globals.parentsProcessed = true;
                    awaitAllAsyncTasksComplete();
                });
        }
        else {
            // If parent boards cannot be checked, set complete and check for all async tasks complete to set timer
            globals.parentsProcessed = true;
            awaitAllAsyncTasksComplete();
        }
    }

    function getParentBoardLinksHtml(nestedBoardCards) {
        let data = { 
            label: 'Parent board' + (nestedBoardCards.length === 1 ? '' : 's') + ':', 
            parents: nestedBoardCards
        };
        let html = Handlebars.templates.parentBoardLinks(data);
        return html;
    }

    function processAllCardsForNestedBoards() {
        // Nested boards are cards with board link in description, so first find all cards with a description
        let cardsWithDescriptions = $(config.CSS.trello.card).has(config.CSS.trello.description);
        globals.cardsFound = cardsWithDescriptions.length;
        if (globals.cardsFound > 0) {
            $.get(getApiUrlFromUrl(document.location.href, urlTypeEnum.board), function(data, status, jqXHR) {
                if (jqXHR.getResponseHeader('content-type').includes('json')) {
                    // Save board data with card details if JSON was returned (Trello returns an HTML error page otherwise)
                    globals.boardDetails = data;
                }
            })
                .always(function() {
                    //  Get metered rate to avoid overloading Trello.  See issue #43.
                    let rate = getMeteredRate(cardsWithDescriptions.length);

                    // Process cards even if failure.  Could have a bad URL, 
                    // in which case this will force requesting each card individually
                    cardsWithDescriptions.each(function(index, element) {
                        // Ensure first request has a delay, see Issue #50
                        setTimeout(processCardForNestedBoard, rate * (index + 1), element, true);
                    });
                });
        }
        else {
            // If no nested boards found, still want to set timer to periodically check for new nested boards
            awaitAllAsyncTasksComplete();
        }
    }

    function getCardDetailsFromBoardDetails(url) {
        if (globals.boardDetails.cards && globals.boardDetails.cards.length > 0) {
            return globals.boardDetails.cards.find(function(card) {
                return (url === card.url || url === card.shortUrl);
            });
        }
    }

    function processCardForNestedBoard(element, processingPage) {
        // Find card URL, title which will hold board summary, and get card JSON
        let card = $(element);
        let title = card.find(config.CSS.trello.cardTitle).first();

        let cardLink = card[0].href;
        let cardDetails = getCardDetailsFromBoardDetails(cardLink);
        if (cardDetails !== undefined) {
            if (cardDetails.desc.isBoardUrl()) { // is nested board
                processNestedBoard(cardDetails, title, card, processingPage);
            }
            else {
                clearNestedBoard(title, card);
            }

            // Close out card if processing page (check for all async tasks complete to set timer)
            if (processingPage) {
                globals.cardsProcessed++;
                awaitAllAsyncTasksComplete();
            }
        }
        else {
            // Get card JSON
            $.get(getApiUrlFromUrl(cardLink, urlTypeEnum.card), function(cardData) {
                if (cardData.desc.isBoardUrl()) { // is nested board
                    processNestedBoard(cardData, title, card, processingPage);
                }
                else { 
                    clearNestedBoard(title, card);
                }
            })
                .fail(function() {
                    // Show failure message if AJAX request fails and message not already displayed
                    if (title.find(config.CSS.boardSummary.error).length === 0) {
                        title.append(config.HTML.cardError);
                    }
                    globals.errorCount++;
                })
                .always(function() {
                    // When AJAX requests is complete, increment counter and check for all async tasks complete to set timer
                    if (processingPage) {
                        globals.cardsProcessed++;
                        awaitAllAsyncTasksComplete();
                    }
                });
        }
    }

    function clearNestedBoard(title, card) {
        // not nested board, remove any existing board summary and icon and re-display other card content
        if (title.find(config.CSS.boardSummary.boardIcon).length > 0) {
            title.find(config.CSS.boardSummary.boardIcon).remove();
            title.find(config.CSS.boardSummary.container).remove();

            if (!globals.userOptions.showCardLabels) {
                card.find(config.CSS.trello.cardLabels).removeAttr('style');
            }
            if (!globals.userOptions.showCardBadges) {
                card.find(config.CSS.trello.cardBadges).removeAttr('style');
            }
            if (globals.userOptions.hideCardDescription) {
                card.find(config.CSS.trello.cardBadges).removeClass(config.CSS.boardSummary.hideDescriptionClassName);
            }
            if (!globals.userOptions.showCardMembers) {
                card.find(config.CSS.trello.cardMembers).removeAttr('style');
            }

            title.off(config.CSS.boardSummary.cardEventNamespace);
        }
    }

    function processNestedBoard(cardData, title, card, processingPage) {
        if (processingPage) {
            globals.boardsFound++;
        }

        // Get board JSON
        let boardLink = cardData.desc;
        $.get(getApiUrlFromUrl(boardLink, urlTypeEnum.board), function(data) {
            // Parse board summary from JSON and get HTML
            let content = getBoardSummaryHtml(data);

            // Change default functionality so click opens the nested board and
            // right click opens the card so it can be edited
            title.on('click' + config.CSS.boardSummary.cardEventNamespace, function(e) {
                document.location = boardLink;
                e.stopPropagation();
                return false;
            });

            // Hide other elements not related to nested board based on settings.
            // If not hiding card content remove any previously hidden content to 
            // cover the case where the options were changed.  See issue #5.
            if (globals.userOptions.showCardLabels) {
                card.find(config.CSS.trello.cardLabels).removeAttr('style');
            }
            else {
                card.find(config.CSS.trello.cardLabels).css('display', 'none');
            }

            if (globals.userOptions.showCardBadges) {
                card.find(config.CSS.trello.cardBadges).removeAttr('style');
            }
            else {
                card.find(config.CSS.trello.cardBadges).css('display', 'none');
            }

            if (globals.userOptions.hideCardDescription) {
                card.find(config.CSS.trello.cardBadges).addClass(config.CSS.boardSummary.hideDescriptionClassName);
            }
            else {
                card.find(config.CSS.trello.cardBadges).removeClass(config.CSS.boardSummary.hideDescriptionClassName);
            }
            
            if (globals.userOptions.showCardMembers) {
                card.find(config.CSS.trello.cardMembers).removeAttr('style');
            }
            else {
                card.find(config.CSS.trello.cardMembers).css('display', 'none');
            }


            // Add/update board icon.  Need to update in case color changed, see issue #57.
            let iconColor = getBoardSummaryIconColor(cardData, globals.userOptions.nestedBoardIcon);
            let iconHtml = getBoardSummaryIconHtml(iconColor, 'Nested Board', false);
            if (title.find(config.CSS.boardSummary.boardIcon).length > 0) {
                title.children(config.CSS.boardSummary.boardIcon).replaceWith(iconHtml);
            }
            else {
                title.prepend(iconHtml);
            }

            // Replace existing board summary if it exists, otherwise add new board summary
            if (title.find(config.CSS.boardSummary.container).length > 0) {
                title.children(config.CSS.boardSummary.container).replaceWith(content);
            }
            else {
                title.append(content);
            }
        })
            .fail(function(data) {
                if (data.status && (data.status === httpNotFoundResponse || data.status === httpUnauthorizedResponse)) {
                    // Add/update board error icon.  Need to update in case color changed, see issue #57.
                    let statusText = data.status === httpUnauthorizedResponse ? config.errorMessages.boardAccessUnauthorizedError : config.errorMessages.boardNotFoundError;
                    let iconColor = getBoardSummaryIconColor(cardData, globals.userOptions.nestedBoardIcon);
                    let iconHtml = getBoardSummaryIconHtml(iconColor, statusText, true);
                    if (title.find(config.CSS.boardSummary.boardIcon).length > 0) {
                        title.children(config.CSS.boardSummary.boardIcon).replaceWith(iconHtml);                
                    }
                    else {
                        title.prepend(iconHtml);
                    }
                }
                else {
                    // Show failure message if AJAX request fails and message not already displayed
                    if (title.find(config.CSS.boardSummary.error).length === 0) {
                        title.append(config.HTML.boardSummaryError);
                    }
                    globals.errorCount++;
                }
            })
            .always(function() {
                // When AJAX requests is complete, increment counter and check for all async tasks complete to set timer
                if (processingPage) {
                    globals.boardsProcessed++;
                    awaitAllAsyncTasksComplete();
                }
            });
    }

    function processAllHomePageBoards() {
        // Check if home page
        let boardElements = $(config.CSS.trello.board);

        // Add summary if boards are found on home page
        if (boardElements.length > 0) {
            let rate = getMeteredRate(boardElements.length);

            boardElements.each(function(index, element) {
                // Ensure first request has a delay, see Issue #50
                processHomePageBoard(element, true, rate * (index + 1));
            });
        }
        else {
            // If no boards found, set timer to re-check after delayed page content change
            awaitAllAsyncTasksComplete();
        }
    }

    function processHomePageBoard(element, processingPage, delay) {
        // Check that link is a board, and if so request board JSON
        let a = $(element).children(config.CSS.trello.boardLink).first();
        let link = a[0].href;
        if (link.isBoardUrl()) { //is a board
            if (processingPage) {
                globals.boardsFound++;
            }

            // Timeout is set here rather than in processAllHomePageBoards to ensure that boardsFound is incremented
            // first.  Otherwise, processing completes in awaitAllAsyncTasksComplete multiple times.  See issue #43.
            setTimeout(function() {
                // Get board JSON
                $.get(getApiUrlFromUrl(link, urlTypeEnum.board), function(data) {
                    // Parse board summary from JSON and get HTML
                    let content = getBoardSummaryHtml(data);
                    
                    // Delete existing board summary if it exists and add new board summary
                    if (a.find(config.CSS.boardSummary.container).length > 0) {
                        a.find(config.CSS.boardSummary.container).replaceWith(content);
                    }
                    else {
                        a.find(config.CSS.trello.boardDetailsName).first().after(content);
                    }
                })
                    .fail(function() {
                        // Show failure message if AJAX request fails and message not already displayed
                        if (a.find(config.CSS.boardSummary.error).length === 0) {
                            a.find(config.CSS.trello.boardDetailsName).first().after(config.HTML.boardSummaryError);
                        }
                        globals.errorCount++;
                    })
                    .always(function() {
                        // When AJAX requests is complete, if processing page increment counter and check for 
                        // all async tasks complete to set timer
                        if (processingPage) {
                            globals.boardsProcessed++;
                            awaitAllAsyncTasksComplete();
                        }
                        else {
                            // If not processing page and a board was found then set board heights
                            setHomePageBoardHeight();
                        }
                    });
            }, delay);
        }
        // If no board found and processing page set timer to re-check
        else if (processingPage) {
            awaitAllAsyncTasksComplete();
        }
    }
    
    function awaitAllAsyncTasksComplete() {
        // Only start timer if all async requests are complete.  Only check for parent boards processed on board page.
        if (globals.cardsFound === globals.cardsProcessed && globals.boardsFound === globals.boardsProcessed && 
            (globals.pageType === pageTypeEnum.home || (globals.pageType === pageTypeEnum.board && globals.parentsProcessed))) {
                
            let timeout;

            // Verify mutation observer is observing. will start if first pass.
            startObserver();

            // If reprocess page then set short timer and repeat.  Covers case where page change occurs during 
            // page processing, and without this the new page is not processed.  See Issue #53.
            if (globals.reprocessPage === true) {
                timeout = config.settings.newPageTimeout;
                globals.reprocessPage = false;
            }
            // If no boards are found set brief timer and recheck a number of times to confirm page change is complete for large boards.
            else if (globals.boardsFound === 0 && globals.errorCount === 0 && ++globals.boardCheckCounter <= config.settings.boardCheckCounterMax) {
                timeout = config.settings.newPageTimeout;
            }
            // If no parents found, set a longer timer to recheck a number of times.  It can take Trello some time for changes to be 
            // reflected in the search results.
            else if (globals.pageType === pageTypeEnum.board && 
                ++globals.parentCheckCounter <= config.settings.parentCheckCounterMax && globals.parentsFound === 0) {
                
                timeout = config.settings.parentTimeout;
            }
            else {
                timeout = config.settings.oneMinuteTimeout * globals.userOptions.boardRefreshTime;
            }

            globals.timeoutID = setTimeout(processPage, timeout);

            if (globals.pageType === pageTypeEnum.home) {
                setHomePageBoardHeight();
            }

            // Reset board data to ensure refreshed for card changes
            globals.boardDetails = {};

            globals.processingPage = false;
        }
    }

    function getBoardSummaryIconColor(cardData, nestedBoardIcon) {
        if (nestedBoardIcon === 'default') {
            return config.settings.iconDefaultColor;
        }
        else if (nestedBoardIcon === 'label') {
            return cardData.labels && cardData.labels.length > 0 ? cardData.labels[0].color : 
                config.settings.iconNoLabelColor;
        }
        else {
            return nestedBoardIcon;
        }
    }

    function getBoardSummaryIconHtml(iconColor, title, isError) {
        let data =  { color: iconColor, title: title, isError: isError};
        let html = Handlebars.templates.boardSummaryIcon(data);
        return html;
    }

    function getBoardSummaryHtml(data) {
        // Parse board JSON
        let boardSummary = getBoardSummaryFromJson(data);

        // Format data and get HTML from template
        let boardSummaryData =  { options: globals.userOptions, board: boardSummary};
        let html = Handlebars.templates.boardSummary(boardSummaryData);
        return html;
    }

    function getBoardSummaryFromJson(data) {
        let summary = {
            name: data.name,
            lists: 0,
            cardsOpen: 0,
            cardsTotal: 0,
            pastDue: 0,
            dueNow: 0,
            dueToday: 0,
            dueSoon: 0,
            dueComplete: 0,
            closed: false,
            checkItems: 0,
            checkItemsChecked: 0,
            completePercent: 0
        };

        // Only process boards that are not archived
        if (data.closed) {
            summary.closed = true;
        }
        else {
            // Get count of lists and IDs for open lists (needed to identify open cards in archived lists)
            summary.lists = data.lists.length;
            let openListIds = data.lists.map(list => list.id);

            // Process cards, resulting in counts of total/open cards, checkitems, and each date due type           
            summary.cardsTotal = data.cards.length;
            data.cards.forEach(function(card) {
                // Only process visible cards for other counts. Open cards includes cards that are 
                // on archived lists, so check against open lists and assume those are effectively "closed".
                if (!card.closed && openListIds.includes(card.idList)) {
                    summary.cardsOpen++;
                    summary.checkItems += card.badges.checkItems;
                    summary.checkItemsChecked += card.badges.checkItemsChecked;

                    // If a due date is specified, check for and increment the appropriate counter
                    if (card.due !== null) {
                        if (card.dueComplete) {
                            summary.dueComplete++;
                        }
                        else {
                            let timeDueDelta = Date.parse(card.due) - Date.now();
                            if (timeDueDelta <= 0) {
                                if (timeDueDelta > (hoursToMilliseconds * config.settings.dueNowHours)) {
                                    summary.dueNow++;
                                }
                                else {
                                    summary.pastDue++;
                                }
                            }
                            else {
                                let diffDays = Math.ceil(timeDueDelta / (hoursToMilliseconds * config.settings.dueTodayHours));
                                if (diffDays <= 1) {
                                    summary.dueToday++;
                                }
                                else if (diffDays <= globals.userOptions.dueSoonDays) {
                                    summary.dueSoon++;
                                }
                            }
                        }
                    }
                }
            });
            summary.completePercent = summary.cardsTotal === 0 ? 0 : 
                Math.round(((summary.cardsTotal - summary.cardsOpen) / summary.cardsTotal) * totalPercent);
        }
        return summary;
    }

    const processPendingChanges = debounce(function() {
        if (globals.pendingCards.length > 0) {
            // Get full board JSON, it's just as fast as a single card and there may be multiple cards to process
            $.get(getApiUrlFromUrl(document.location.href, urlTypeEnum.board), function(data, status, jqXHR) {
                if (jqXHR.getResponseHeader('content-type').includes('json')) {
                    // Save board data with card details if JSON was returned (Trello returns an HTML error page otherwise)
                    globals.boardDetails = data;
                }
            })
                .always(function() {
                    // Process cards even if failure.  Could have a bad URL, 
                    // in which case this will force requesting each card individually
                    $.each(globals.pendingCards, function() {
                        // Cases have been seen where, even with logic in observer, orphaned cards
                        // end up in the list, so check that cards are on page before processing.
                        if (document.contains(this)) {
                            processCardForNestedBoard(this, false);
                        }
                    });
                    globals.pendingCards = [];
                    globals.boardDetails = {};
                });
        }

        if (globals.pendingBoards.length > 0) {
            $.each(globals.pendingBoards, function() {
                // Have never seen orphaned boards, but have seen orphaned cards, so double check
                if (document.contains(this)) {
                    processHomePageBoard(this, false);
                }
            });
            globals.pendingBoards = [];
        }
    }, config.settings.longDebounceTimeout, false);

    const observer = new MutationObserver(function(mutations) {
        for (let i = 0; i < mutations.length; i++) {
            let mutation = mutations[i];
            let added = $(mutation.addedNodes);
            let removed = $(mutation.removedNodes);
            let target = $(mutation.target);
            
            if (target.hasClass(config.CSS.trello.boardSectionClassName)) {
                startProcessPage(true);
                break;
            }
            else if (target.hasClass(config.CSS.boardSummary.bstClassName) || added.is(config.CSS.boardSummary.bst) || removed.is(config.CSS.boardSummary.bst)) {
                // Ignore mutations caused by this extension
                return;
            }
            else if (target.hasClass(config.CSS.trello.cardDetailsWindowClassName)) {
                // If card details windows is closed ensure nested board popover is removed
                if (removed.filter(config.CSS.trello.cardDetailsContainer).length > 0) {
                    hideNestedBoardPopover();
                }
            }
            else if (target.hasClass(config.CSS.trello.listClassName)) {
                processMutationListChanged(added, removed);
            }
            else if (target.hasClass(config.CSS.trello.boardListClassName)) {
                processMutationBoardChanged(added);
            }
            else {
                processMutationForCardDescendants(target, added, removed);
            } 
        }
    });

    function processMutationListChanged(added, removed) {
        // List changed, check for cards added/removed.  Ignore placeholder cards
        // used as drop zones when dragging cards.  In some cases cards are 
        // added/removed/changed multiple times, especially when moving between lists, 
        // dequeue any pending card that was removed.
        let cards = removed.filter(config.CSS.trello.cardNotPlaceholder);
        if (cards.length > 0) {
            for (let j = 0; j < cards.length; j++) {
                globals.pendingCards.remove(cards[j]);
            }
        }

        cards = added.filter(config.CSS.trello.cardNotPlaceholder);
        if (cards.length > 0) {
            for (let k = 0; k < cards.length; k++) {
                globals.pendingCards.pushUnique(cards[k]);
                processPendingChanges();
            }
        }
    }

    function processMutationBoardChanged(added) {
        // Process any board added to home/boards pages
        let boards = added.filter(config.CSS.trello.board);
        if (boards.length > 0) {
            for (let j = 0; j < boards.length; j++) {
                globals.pendingBoards.pushUnique(boards[j]);
                processPendingChanges();
            }
        }
    }

    function processMutationForCardDescendants(target, added, removed) {
        // Check if change is a descendant of a card
        let card = target.closest(config.CSS.trello.card);
        if (card.length > 0) {
            // Found that Trello has started cycling badges every 10 seconds, which was causing
            // board data to be pulled every time since any card change triggered the request.  Added 
            // logic to more precisely filter for card changes that required checking data.
            let maxChange = added.length > removed.length ? added.length : removed.length;
            for (let j = 0; j < maxChange; j++) {
                let addedName = getMutationName(added[j]);
                let removedName = getMutationName(removed[j]);

                // If only added, only removed, or added/removed different then process card
                if (addedName !== removedName) {
                    globals.pendingCards.pushUnique(card[0]);
                    processPendingChanges();

                    // If any change found for card (all with the same target), can break out of loop
                    break;
                }
            }
        }
    }

    function getMutationName(mutation) {
        return (mutation && mutation.tagName && mutation.className) ? mutation.tagName.toLowerCase() + '.' + mutation.className : 'none';
    }

    function startObserver() {
        if (globals.observerStarted === false) {
            observer.observe(document.body, { childList: true, characterData: true, attributes: false, subtree: true });
            globals.observerStarted = true;
        }
    }

    function stopPageProcessing() {
        observer.disconnect();
        clearTimeout(globals.timeoutID);
        globals.boardCheckCounter = 0;
        globals.parentCheckCounter = 0;
        globals.observerStarted = false;
    }

    // Debounce processPage instead of startProcessPage so that background processes are stopped at the first call to 
    // startProcessPage, but the page processing overall is debounced to trigger off the last call.  See issue #43.
    const processPageDebounce = debounce(function(reprocessPage) {
        processPage(reprocessPage);
    }, config.settings.longDebounceTimeout, false);

    function startProcessPage(isPageLoad) {
        // Remove home page resize handler, will be added if home page
        $(window).off(config.CSS.boardSummary.homePageEventNamespace);

        if (document.location.href.isCardUrl()) {
            // Card is displayed, process card edit popup
            processCardEditPopup();

            // If a card page is loaded directly, this will start processing the background board page.  Otherwise, 
            // if a card is simply opened for editing, this will exit without restarting the board page processing.
            if (!isPageLoad) {
                return;
            }
        }

        // Stop any existing observer/timer since there's a lot of change traffic when switching pages, 
        // so allow some time for this to settle before processing to minimize repeated processing.  
        // Also reset global page data that's independent of page processing (most is reset there).
        stopPageProcessing();

        // Start checking for boards, debounced since this gets called multiple times with history update.
        // No delay needed since built into debounce.  See issue #43.
        // Call with reprocessPage = true to force page processing to be repeated if in progress, which ensures
        // a new page is loaded correctly.  See issue #53.
        processPageDebounce(true);
    }

    return {
        start: startProcessPage
    };
})();


$(function() {
    'use strict';

    // Start timer on page load
    boardSummary.start(true);
});


