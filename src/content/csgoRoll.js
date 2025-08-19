import * as csgoRollParser from './csgoRollParser.js';
import { convertObjectToItem } from '../core/dataParser.js';
import { StatusEnum } from '../core/StatusEnum.js';
import { getLogLevel } from '../core/logLevel.js';

console[getLogLevel(true)]("csgoroll.com content script loaded");

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console[getLogLevel(true)]("CSGORoll request: ", request.action);
    switch (request.action) {
        case "pricesUpdated":
            console[getLogLevel(true)]("Prices updated notification received, success:", request.success);
            if (request.success) {
                if (extensionEnabled) {
                    csgoRollParser.removeCustomHtml();
                    csgoRollParser.unHideAllItems();
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
            csgoRollParser.removeCustomHtml();
            csgoRollParser.unHideAllItems();
            refreshLoading();
            break;
        case "updateVisibilityByFilters":
            console[getLogLevel(true)]("Updating item visibility by filters");
            csgoRollParser.updateVisibilityByFilters(
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
    console[getLogLevel(true)]("Initializing Observer");

    let grid = ""
    let tagName = ""
    if (csgoRollParser.isStore()) {
        grid = '#grid-container .cdk-virtual-scroll-content-wrapper'
        tagName = 'CW-CSGO-MARKET-ITEM-CARD-WRAPPER'
    } else if (csgoRollParser.isInventory()) {
        grid = '.grid'
        tagName = 'CW-CSGO-MARKET-ITEM-CARD'
    }

    console[getLogLevel(true)]("Grid:", grid);
    console[getLogLevel(true)]("Tag name:", tagName);

    const targetContainer = document.querySelector(grid);
    if (!targetContainer) {
        setTimeout(initObserver, 500);
        return;
    }


    currentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === tagName) {
                        processItem(node);
                    }
                });
            }
        });
    });
    
    currentObserver.observe(targetContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });

    targetContainer.querySelectorAll(tagName).forEach(node => processItem(node));
}

function processItem(itemDiv) {
    if (itemDiv.querySelector('.custom-box')) {
        console[getLogLevel(true)]("Item already processed, skipping");
        return;
    }

    const item = csgoRollParser.extractItemDetails(itemDiv);
    if (!item) {
        console[getLogLevel(false)]("Failed to extract store item details");
        return;
    }
    
    console[getLogLevel(true)]("Extracted store item:", item);
    updateItemPrice(itemDiv, item);
}

function updateItemPrice(div, item) {
    if (!extensionEnabled) {
        console[getLogLevel(true)]("Extension is disabled, skipping item processing");
        return;
    }
    
    div.setAttribute('data-processing', 'true');
    
    // Check if extension context is still valid
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
        console[getLogLevel(false)]("Extension context invalidated, cannot process item");
        div.removeAttribute('data-processing');
        csgoRollParser.createCustomBox(div, "Extension disconnected, please refresh page", 'error');
        return;
    }
    
    try {
        chrome.runtime.sendMessage({
            action: 'updateItemPrice',
            message: item
        }, (response) => {
            // Remove loading state
            div.removeAttribute('data-processing');
            
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message;
                console[getLogLevel(false)]("Chrome runtime error:", errorMessage);
                
                // Handle specific extension context invalidated error
                if (errorMessage.includes('Extension context invalidated') || 
                    errorMessage.includes('message port closed') ||
                    errorMessage.includes('receiving end does not exist')) {
                    csgoRollParser.createCustomBox(div, "Extension disconnected, please refresh page", 'error');
                } else {
                    csgoRollParser.createCustomBox(div, "Error updating prices... ", 'info');
                }
                return;
            }
            
            if (!response) {
                csgoRollParser.createCustomBox(div, "Error updating prices... ", 'info');
                console[getLogLevel(false)]("No response received from background script");
                return;
            }
            
            if (!response.success) {
                // if (response.message === StatusEnum.PRICES_EXPIRED) {
                // for now, just add a loading box and assume prices are expired
                console[getLogLevel(true)]("Failed to update item price:", response.message);
                csgoRollParser.createCustomBox(div,  "Prices are updating... ⏳", 'info');
                return;
            }
            
            console[getLogLevel(true)]("Received item data from background:", response);
            
            csgoRollParser.updateItem(
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
        csgoRollParser.createCustomBox(div, "Extension disconnected, please refresh page", 'error');
    }
}