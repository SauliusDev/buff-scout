import * as csgoEmpireParser from './csgoEmpireParser.js';
import { convertObjectToItem } from '../core/dataParser.js';
import { StatusEnum } from '../core/StatusEnum.js';
import { getLogLevel } from '../core/logLevel.js';

console[getLogLevel(true)]("csgoempire.com content script loaded");

let currentObserver = null;
let extensionEnabled = true; 

chrome.runtime.sendMessage({ action: 'getEnableExtension' }, (response) => {
    if (chrome.runtime.lastError) {
        console[getLogLevel(false)]("Error getting initial extension state:", chrome.runtime.lastError.message);
        return;
    }
    if (response && response.success) {
        extensionEnabled = response.message;
    }
});


function pollForBroadcastMessages() {
    // Check if extension context is still valid before making the call
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
        return;
    }
    
    try {
        chrome.runtime.sendMessage({ action: 'getPendingBroadcast' }, (response) => {
            if (chrome.runtime.lastError) {
                const error = chrome.runtime.lastError.message;
                if (!error.includes('Extension context invalidated') && 
                    !error.includes('message port closed') &&
                    !error.includes('receiving end does not exist')) {
                    console[getLogLevel(false)]("Error polling for broadcast messages:", error);
                }
                return;
            }
            
            if (response && response.success && response.message) {
                const message = response.message;
                console[getLogLevel(true)]("Received pending broadcast message:", message.action);
                switch (message.action) {
                    case "pricesUpdated":
                        console[getLogLevel(true)]("Prices updated notification received, success:", message.success);
                        if (message.success) {
                            if (extensionEnabled) {
                                csgoEmpireParser.removeCustomHtml();
                                csgoEmpireParser.unHideAllItems();
                                refreshLoading();
                            }
                        } else {
                            console[getLogLevel(false)]("Price update failed");
                        }
                        break;
                    case "enableExtension": 
                        extensionEnabled = true;
                        console[getLogLevel(true)]("Extension enabled - processing existing items");
                        refreshLoading();
                        break;
                    case "disableExtension":
                        extensionEnabled = false;
                        console[getLogLevel(true)]("Extension disabled - cleaning up");
                        csgoEmpireParser.removeCustomHtml();
                        csgoEmpireParser.unHideAllItems();
                        refreshLoading();
                        break;
                    case "updateVisibilityByFilters":
                        console[getLogLevel(true)]("Updating item visibility by filters");
                        csgoEmpireParser.updateVisibilityByFilters(
                            message.isCoinRatioEnabled,
                            message.coinRatioThreshold,
                            message.isSupplyEnabled,
                            message.supplyThreshold
                        );
                        break;
                    default:
                        break;
                }
            }
        });
    } catch (error) {
        // Silently handle extension context invalidation - this is expected when extension is reloaded
    }
}
setInterval(pollForBroadcastMessages, 2000);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console[getLogLevel(true)]("CSGOEmpire request: ", request.action);
    switch (request.action) {
        case "pricesUpdated":
            console[getLogLevel(true)]("Prices updated notification received, success:", request.success);
            if (request.success) {
                if (extensionEnabled) {
                    csgoEmpireParser.removeCustomHtml();
                    csgoEmpireParser.unHideAllItems();
                    refreshLoading();
                }
            } else {
                console[getLogLevel(false)]("Price update failed");
            }
            break;
        case "enableExtension": 
            extensionEnabled = true;
            console[getLogLevel(true)]("Extension enabled - processing existing items");
            refreshLoading();
            break;
        case "disableExtension":
            extensionEnabled = false;
            console[getLogLevel(true)]("Extension disabled - cleaning up");
            csgoEmpireParser.removeCustomHtml();
            csgoEmpireParser.unHideAllItems();
            refreshLoading();
            break;
        case "updateVisibilityByFilters":
            console[getLogLevel(true)]("Updating item visibility by filters");
            csgoEmpireParser.updateVisibilityByFilters(
                request.isCoinRatioEnabled,
                request.coinRatioThreshold,
                request.isSupplyEnabled,
                request.supplyThreshold
            );
            break;
        case "urlChanged":
            if (extensionEnabled) {
                refreshLoading();
            }
            break;
        default:
            break;
    }
});

function refreshLoading() {
    if (currentObserver) {
        console[getLogLevel(true)]("Disconnecting current observer");
        currentObserver.disconnect();
        currentObserver = null;
    }
    initObserver();
}

function initObserver() {
    console[getLogLevel(true)]("Initializing CSGOEmpire Observer");

    let containerSelector = '';
    let itemSelector = '';
    
    if (csgoEmpireParser.isMarketplace()) {
        containerSelector = '.grid, .items-grid, [class*="grid"]';
        itemSelector = '.relative.rounded-lg.bg-dark-3, .item-card';
    } else if (csgoEmpireParser.isInventory()) {
        containerSelector = '.inventory-grid, .deposit-grid, [class*="grid"]';
        itemSelector = '.relative.rounded-lg.bg-dark-3, .item-card';
    } else {
        containerSelector = 'body';
        itemSelector = '.relative.rounded-lg.bg-dark-3, .item-card';
    }

    console[getLogLevel(true)]("Container selector:", containerSelector);
    console[getLogLevel(true)]("Item selector:", itemSelector);

    const targetContainer = document.querySelector(containerSelector) || document.body;
    
    if (!targetContainer) {
        console[getLogLevel(true)]("Container not found, retrying in 500ms");
        setTimeout(initObserver, 500);
        return;
    }

    currentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches && node.matches(itemSelector)) {
                            processItem(node);
                        } else {
                            const items = node.querySelectorAll ? node.querySelectorAll(itemSelector) : [];
                            items.forEach(item => processItem(item));
                        }
                    }
                });
            }
        });
    });
    
    currentObserver.observe(targetContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });

    const existingItems = targetContainer.querySelectorAll(itemSelector);
    console[getLogLevel(true)](`Processing ${existingItems.length} existing items`);
    existingItems.forEach(item => processItem(item));
}

function processItem(itemDiv) {
    if (!itemDiv || itemDiv.querySelector('.custom-box')) {
        console[getLogLevel(true)]("Item already processed or invalid, skipping");
        return;
    }

    const item = csgoEmpireParser.extractItemDetails(itemDiv);
    if (!item) {
        console[getLogLevel(false)]("Failed to extract CSGOEmpire item details");
        return;
    }
    
    console[getLogLevel(true)]("Extracted CSGOEmpire item:", item);
    updateItemPrice(itemDiv, item);
}

function updateItemPrice(div, item) {
    if (!extensionEnabled) {
        console[getLogLevel(true)]("Extension is disabled, skipping item processing");
        return;
    }
    
    div.setAttribute('data-processing', 'true');
    
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
        console[getLogLevel(false)]("Extension context invalidated, cannot process item");
        div.removeAttribute('data-processing');
        csgoEmpireParser.createCustomBox(div, "Extension disconnected, please refresh page", 'error');
        return;
    }
    
    try {
        chrome.runtime.sendMessage({
            action: 'updateItemPrice',
            message: item
        }, (response) => {
            div.removeAttribute('data-processing');
            
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message;
                console[getLogLevel(false)]("Chrome runtime error:", errorMessage);
                
                if (errorMessage.includes('Extension context invalidated') || 
                    errorMessage.includes('message port closed') ||
                    errorMessage.includes('receiving end does not exist')) {
                    csgoEmpireParser.createCustomBox(div, "Extension disconnected, please refresh page", 'error');
                } else {
                    csgoEmpireParser.createCustomBox(div, "Error updating prices... ", 'info');
                }
                return;
            }
            
            if (!response) {
                csgoEmpireParser.createCustomBox(div, "Error updating prices... ", 'info');
                console[getLogLevel(false)]("No response received from background script");
                return;
            }

            if (!response.success && response.message === StatusEnum.ITEM_NOT_FOUND) {
                console[getLogLevel(true)]("Item not found:", response.message);
                csgoEmpireParser.createCustomBox(div, "Item not found", 'info');
                return;
            }
            
            if (!response.success && response.message === StatusEnum.PRICES_EXPIRED) {
                console[getLogLevel(true)]("Prices are expired:", response.message);
                csgoEmpireParser.createCustomBox(div,  "Prices are updating... ⏳", 'info');
                return;
            }

            if (!response.success) {
                console[getLogLevel(true)]("Unknown error:", response.message);
                csgoEmpireParser.createCustomBox(div,  "Uknown error, reload the page", 'info');
                return;
            }
            
            console[getLogLevel(true)]("Received item data from background:", response);
            
            csgoEmpireParser.updateItem(
                div,
                convertObjectToItem(response.item),
                response.isCoinRatioEnabled,
                response.coinRatioThreshold,
                response.isSupplyEnabled,
                response.supplyThreshold
            );
        });
    } catch (error) {
        console[getLogLevel(false)]("Error sending message to background:", error.message);
        div.removeAttribute('data-processing');
        csgoEmpireParser.createCustomBox(div, "Extension disconnected, please refresh page", 'error');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
} else {
    initObserver();
}

