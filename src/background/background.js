import { StatusEnum } from '../core/StatusEnum.js';
import * as repository from '../repository/repository.js';
import { convertObjectToItem } from '../core/dataParser.js';
import { getLogLevel } from '../core/logLevel.js';

repository.initializeInstanceId();

// Initialize prices cache immediately to prevent race conditions
(async () => {
    try {
        await repository.loadPricesCache();
        console[getLogLevel(true)]("Prices cache initialized on startup");
        await updatePrices();
    } catch (error) {
        console[getLogLevel(false)]("Error initializing prices cache on startup:", error.message);
    }
})();

let isUpdatingPrices = false;
let isUpdatingVisibilityByFilters = false;
let isEnablingScout = false;
let isDisablingScout = false;

// Priority Queue System for Requests
const lightQueue = [];
const heavyQueue = [];
let processingHeavy = false;

// Start the routine checker to renew the prices
const PRICE_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes
setInterval(updatePrices, PRICE_CHECK_INTERVAL);

function isLightRequest(request) {
    const lightActions = [
        // Settings
        'getCoinRatio',
        'getHideItemsBelowCoinRatio',
        'getSupply',
        'getHideItemsBelowSupply',
        'getEnableExtension',
        // Prices
        'getLastUpadtedBuffPrice',
        'getIsUpdatingPrices',
        'getPendingBroadcast',
        // License
        'activateLicense',
        'authCheck',
        'refreshAuthCheck',
        'getSteamProfile',
        'clearSteamProfile',
        'checkSteamLogin',
        'setSteamLogoutIntent',
        'getSteamLogoutIntent', 
        'clearSteamLogoutIntent',
        'steamSignInBuffScout',
        'steamSignOutBuffScout',
    ];
    return lightActions.includes(request.action);
}

async function processHeavyQueue() {
    if (processingHeavy) return;
    processingHeavy = true;
    while (heavyQueue.length > 0) {
        const { request, sender, sendResponse } = heavyQueue.shift();
        await handleRequest(request, sender, sendResponse, /*isHeavy*/true);
    }
    processingHeavy = false;
}

function processLightQueue() {
    while (lightQueue.length > 0) {
        const { request, sender, sendResponse } = lightQueue.shift();
        handleRequest(request, sender, sendResponse, /*isHeavy*/false);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console[getLogLevel(true)]("Background request: ", request.action);
    
    if (isLightRequest(request)) {
        lightQueue.push({ request, sender, sendResponse });
        processLightQueue();
        return true;
    } else {
        heavyQueue.push({ request, sender, sendResponse });
        processHeavyQueue();
        return true;
    }
});

async function handleRequest(request, sender, sendResponse, isHeavy) {

    switch (request.action) {
        // Api calls and item data updates
        case 'authCheck':
            try {
                const authStatus = await repository.getCachedUserAuthStatus();
                sendResponse({ 
                    success: true, 
                    authorized: authStatus.authorized,
                    plan: authStatus.plan
                });
            } catch (error) {
                console[getLogLevel(false)]("Auth check failed:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'refreshAuthCheck':
            try {
                const authStatus = await repository.refreshUserAuthStatus();
                sendResponse({ 
                    success: true, 
                    authorized: authStatus.authorized,
                    plan: authStatus.plan
                });
            } catch (error) {
                console[getLogLevel(false)]("Refresh auth check failed:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'updateItemPrice':
            try {
                // This would be triggered only in the initial extension load when the prices are 
                // in the process of being updated.
                // 
                // No need to call the updatePrices function here, it be called by the webNavigation.onHistoryStateUpdated listener
                // or by the auto is prices expired routine checker.
                if (isUpdatingPrices) {
                    sendResponse({ success: false, message: StatusEnum.PRICES_EXPIRED });
                    return;
                }

                const item = convertObjectToItem(request.message);
                await repository.getItemDataByID(item);
                let response = { 
                    success: true,
                    item: item,
                    isCoinRatioEnabled: false,
                    coinRatioThreshold: 0,
                    isSupplyEnabled: false,
                    supplyThreshold: 0
                };
                const authStatus = await repository.getCachedUserAuthStatus();
                if (authStatus.plan === 'Pro') {
                    const isCoinRatioEnabled = await repository.getHideItemsBelowCoinRatio();
                    const coinRatioThreshold = await repository.getCoinRatio();
                    const isSupplyEnabled = await repository.getHideItemsBelowSupply();
                    const supplyThreshold = await repository.getSupply();
                    response.isCoinRatioEnabled = isCoinRatioEnabled;
                    response.coinRatioThreshold = coinRatioThreshold;
                    response.isSupplyEnabled = isSupplyEnabled;
                    response.supplyThreshold = supplyThreshold;
                }
                sendResponse(response);
            } catch (error) {
                console[getLogLevel(false)]("Error updating item price:", error.message);
                
                // If cache is not available, trigger a price update for future requests
                if (error.message === StatusEnum.PRICES_EXPIRED && !isUpdatingPrices) {
                    console[getLogLevel(true)]("Triggering price update due to missing cache");
                    updatePrices().catch(updateError => {
                        console[getLogLevel(false)]("Failed to trigger price update:", updateError.message);
                    });
                }
                
                sendResponse({ success: false, message: error.message });
            }
            break;
        // Filters/Settings/Storage
        case 'updateVisibilityByFilters': 
            if (isUpdatingVisibilityByFilters) {
                sendResponse({ success: false, message: "Visibility update is already in progress!" });
                return;
            }
            isUpdatingVisibilityByFilters = true;
            try {
                await broadcastToSupportedTabs({
                    action: 'updateVisibilityByFilters',
                    isCoinRatioEnabled: request.isCoinRatioEnabled,
                    coinRatioThreshold: request.coinRatioThreshold,
                    isSupplyEnabled: request.isSupplyEnabled,
                    supplyThreshold: request.supplyThreshold
                }, sender.tab);
                sendResponse({ success: true });
            } catch (error) {
                console[getLogLevel(false)]("Error updating visibility by filters:", error.message);
                sendResponse({ success: false, message: error.message });
            } finally {
                isUpdatingVisibilityByFilters = false;
            }
            break;

        case 'disableExtension':
            if (isDisablingScout) {
                sendResponse({ success: false, message: "Disable scout is already in progress!" });
                return;
            }
            isDisablingScout = true;
            try {
                await broadcastToSupportedTabs({ action: request.action }, sender.tab);
                await repository.saveEnableExtension(false);
                sendResponse({ success: true });
            } catch (error) {
                console[getLogLevel(false)]("Error disabling extension:", error.message);
                sendResponse({ success: false, message: error.message });
            } finally {
                isDisablingScout = false;
            }
            break;

        case 'enableExtension':
            if (isEnablingScout) {
                sendResponse({ success: false, message: "Enable scout is already in progress!" });
                return;
            }
            isEnablingScout = true;
            try {
                await broadcastToSupportedTabs({ action: request.action }, sender.tab);
                await repository.saveEnableExtension(true);
                sendResponse({ success: true });
            } catch (error) {
                console[getLogLevel(false)]("Error enabling extension:", error.message);
                sendResponse({ success: false, message: error.message });
            } finally {
                isEnablingScout = false;
            }
            break;

        case 'saveCoinRatio':
            try {
                await repository.saveCoinRatio(request.coinRatio);
                sendResponse({ success: true, message: "Coin ratio saved successfully!" });
            } catch (error) {
                console[getLogLevel(false)]("Error saving coin ratio:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'getCoinRatio':
            try {
                const coinRatio = await repository.getCoinRatio();
                sendResponse({ success: true, message: coinRatio });
            } catch (error) {
                console[getLogLevel(false)]("Error getting coin ratio:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'saveHideItemsBelowCoinRatio':
            try {
                await repository.saveHideItemsBelowCoinRatio(request.state);
                sendResponse({ success: true, message: "Toggle state saved successfully!" });
            } catch (error) {
                console[getLogLevel(false)]("Error saving hide items below coin ratio:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'getHideItemsBelowCoinRatio':
            try {
                const state = await repository.getHideItemsBelowCoinRatio();
                sendResponse({ success: true, message: state });
            } catch (error) {
                console[getLogLevel(false)]("Error getting hide items below coin ratio:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'saveEnableExtension':
            try {
                await repository.saveEnableExtension(request.state);
                sendResponse({ success: true, message: "Enable extension state saved successfully!" });
            } catch (error) {
                console[getLogLevel(false)]("Error saving enable extension state:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'getEnableExtension':
            try {
                const state = await repository.getEnableExtension();
                sendResponse({ success: true, message: state });
            } catch (error) {
                console[getLogLevel(false)]("Error getting enable extension state:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'saveSupply':
            try {
                await repository.saveSupply(request.supply);
                sendResponse({ success: true, message: "Supply saved successfully!" });
            } catch (error) {
                console[getLogLevel(false)]("Error saving supply:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'getSupply':
            try {
                const supply = await repository.getSupply();
                sendResponse({ success: true, message: supply });
            } catch (error) {
                console[getLogLevel(false)]("Error getting supply:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'saveHideItemsBelowSupply':
            try {
                await repository.saveHideItemsBelowSupply(request.state);
                sendResponse({ success: true, message: "Supply toggle state saved successfully!" });
            } catch (error) {
                console[getLogLevel(false)]("Error saving hide items below supply:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'getHideItemsBelowSupply':
            try {
                const state = await repository.getHideItemsBelowSupply();
                sendResponse({ success: true, message: state });
            } catch (error) {
                console[getLogLevel(false)]("Error getting hide items below supply:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'getIsUpdatingPrices':
            sendResponse({ success: true, message: isUpdatingPrices });
            break;

        case 'getPendingBroadcast':
            const message = pendingBroadcastMessage;
            if (message) {
                // Clear the message after retrieving it once
                pendingBroadcastMessage = null;
            }
            sendResponse({ success: true, message: message });
            break;
        // Auth/License/Steam
        case 'activateLicense':
            try {
                const licenseKey = request.message;
                
                // Check if user is signed in with Steam first
                const steamProfile = await repository.getSteamProfile();
                if (!steamProfile || !steamProfile.steam_id) {
                    sendResponse({ 
                        success: false, 
                        message: 'Please sign in with Steam first before activating a license.' 
                    });
                    return;
                }
                
                const response = await repository.activateLicense(licenseKey);
                const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
                
                // Refresh auth status after successful license activation
                if (parsedResponse.success) {
                    await repository.refreshUserAuthStatus();
                }
                
                console[getLogLevel(true)]("License activated:", parsedResponse.message);
                sendResponse({ success: parsedResponse.success, message: parsedResponse.message });
            } catch (error) {
                console[getLogLevel(false)]("Error activating license:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;
            
        case 'getSteamProfile':
            try {
                const steamProfile = await repository.getSteamProfile();
                sendResponse({ success: true, message: steamProfile });
            } catch (error) {
                console[getLogLevel(false)]("Error getting Steam profile:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'clearSteamProfile':
            try {
                await repository.clearSteamProfile();
                sendResponse({ success: true, message: "Steam profile cleared" });
            } catch (error) {
                console[getLogLevel(false)]("Error clearing Steam profile:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'checkSteamLogin':
            try {
                const steamLogin = await repository.checkSteamLogin();
                sendResponse({ success: true, message: steamLogin });
            } catch (error) {
                console[getLogLevel(false)]("Error checking Steam login:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        // Steam logout intent actions
        case 'setSteamLogoutIntent':
            try {
                await repository.setSteamLogoutIntent(request.message);
                sendResponse({ success: true, message: "Steam logout intent set" });
            } catch (error) {
                console[getLogLevel(false)]("Error setting Steam logout intent:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'getSteamLogoutIntent':
            try {
                const logoutIntent = await repository.getSteamLogoutIntent();
                sendResponse({ success: true, message: logoutIntent });
            } catch (error) {
                console[getLogLevel(false)]("Error getting Steam logout intent:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'clearSteamLogoutIntent':
            try {
                await repository.clearSteamLogoutIntent();
                sendResponse({ success: true, message: "Steam logout intent cleared" });
            } catch (error) {
                console[getLogLevel(false)]("Error clearing Steam logout intent:", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        // Add new BuffScout Steam authentication cases
        case 'steamSignInBuffScout':
            try {
                const steamProfile = request.message;
                const response = await repository.steamSignIn(steamProfile);
                // Refresh auth status after successful sign in
                if (response.success) {
                    await repository.refreshUserAuthStatus();
                }
                sendResponse({ success: response.success, message: response.message });
            } catch (error) {
                console[getLogLevel(false)]("Error signing in with Steam (BuffScout):", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        case 'steamSignOutBuffScout':
            try {
                const response = await repository.steamSignOut();
                await repository.clearUserAuthStatus();
                sendResponse({ success: response.success, message: response.message });
            } catch (error) {
                console[getLogLevel(false)]("Error signing out from Steam (BuffScout):", error.message);
                sendResponse({ success: false, message: error.message });
            }
            break;

        default:
            console[getLogLevel(true)]("Unknown action : ", request.action);
            break;
    }
}

let pendingBroadcastMessage = null;
let activeTabId = null;
let activeTabUrl = null;

(async () => {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            activeTabId = tabs[0].id;
            activeTabUrl = tabs[0].url;
            console[getLogLevel(true)]("Initial active tab:", activeTabUrl);
        }
    } catch (error) {
        console[getLogLevel(false)]("Error getting initial active tab:", error.message);
    }
})();
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        activeTabId = tab.id;
        activeTabUrl = tab.url;
        console[getLogLevel(true)]("Active tab changed:", activeTabUrl);
        if (isSupportedSite(activeTabUrl)) {
            const siteName = activeTabUrl.includes("csgoroll.com") ? "CSGORoll" : "CSGOEmpire";
            console[getLogLevel(true)](`Syncing settings and triggering refresh for ${siteName} tab`);
            chrome.tabs.sendMessage(activeInfo.tabId, {
                action: 'urlChanged',
            }).catch(error => {
                console[getLogLevel(false)]("Failed to send URL change message:", error.message);
            });
            await syncSettingsToActiveTab(activeInfo.tabId);
        }
    } catch (error) {
        console[getLogLevel(false)]("Error getting active tab info:", error.message);
        activeTabId = null;
        activeTabUrl = null;
    }
});

// Listen for tab updates (URL changes in same tab)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (tabId === activeTabId && changeInfo.url) {
        activeTabUrl = changeInfo.url;
        if (isSupportedSite(changeInfo.url)) {
            const siteName = changeInfo.url.includes("csgoroll.com") ? "CSGORoll" : "CSGOEmpire";
            console[getLogLevel(true)](`URL changed on ${siteName} tab:`, changeInfo.url);
            chrome.tabs.sendMessage(tabId, {
                action: 'urlChanged',
            }).catch(error => {
                console[getLogLevel(false)]("Failed to send URL change message:", error.message);
            });
            await syncSettingsToActiveTab(tabId);
            updatePrices();
        }
    }
});

function isSupportedSite(url) {
    if (!url) return false;
    return url.includes('csgoroll.com') || url.includes('csgoempire.com');
}

async function sendToActiveTab(message) {
    if (!activeTabId || !activeTabUrl || !isSupportedSite(activeTabUrl)) {
        console[getLogLevel(true)]("Active tab is not a supported site, skipping direct message");
        return false;
    }
    try {
        await chrome.tabs.sendMessage(activeTabId, message);
        console[getLogLevel(true)]("Message sent to active tab:", message.action);
        return true;
    } catch (error) {
        console[getLogLevel(false)]("Failed to send message to active tab:", error.message);
        return false;
    }
}

async function syncSettingsToActiveTab(tabId) {
    try {
        const extensionEnabled = await repository.getEnableExtension();
        if (extensionEnabled) {
            chrome.tabs.sendMessage(tabId, {
                action: 'enableExtension'
            }).catch(error => {
                console[getLogLevel(false)]("Failed to sync enable state:", error.message);
            });
        } else {
            chrome.tabs.sendMessage(tabId, {
                action: 'disableExtension'
            }).catch(error => {
                console[getLogLevel(false)]("Failed to sync disable state:", error.message);
            });
            return; // If extension is disabled, no need to sync other settings
        }
        const authStatus = await repository.getCachedUserAuthStatus();
        if (authStatus.plan === 'Pro') {
            const isCoinRatioEnabled = await repository.getHideItemsBelowCoinRatio();
            const coinRatioThreshold = await repository.getCoinRatio();
            const isSupplyEnabled = await repository.getHideItemsBelowSupply();
            const supplyThreshold = await repository.getSupply();
            chrome.tabs.sendMessage(tabId, {
                action: 'updateVisibilityByFilters',
                isCoinRatioEnabled: isCoinRatioEnabled,
                coinRatioThreshold: coinRatioThreshold,
                isSupplyEnabled: isSupplyEnabled,
                supplyThreshold: supplyThreshold
            }).catch(error => {
                console[getLogLevel(false)]("Failed to sync filter settings:", error.message);
            });
        }
        
        console[getLogLevel(true)]("Settings synced to tab:", tabId);
    } catch (error) {
        console[getLogLevel(false)]("Error syncing settings to tab:", error.message);
    }
}

async function broadcastToSupportedTabs(message, senderTab = null) {
    pendingBroadcastMessage = message;
    
    // If we have a sender tab (user triggered action) send directly to that tab
    if (senderTab && senderTab.id && senderTab.url && isSupportedSite(senderTab.url)) {
        try {
            await chrome.tabs.sendMessage(senderTab.id, message);
            console[getLogLevel(true)]("Message sent to sender tab:", senderTab.url);
        } catch (error) {
            console[getLogLevel(false)]("Failed to send message to sender tab:", error.message);
        }
    } else {
        // For automatic updates (like price updates), send to active tab if it's a supported site
        const sent = await sendToActiveTab(message);
        if (!sent) {
            console[getLogLevel(true)]("No active supported tab found for broadcast message");
        }
    }
}

async function updatePrices() {
    if (isUpdatingPrices) {
        return;
    }
    
    if (await repository.areMarketplacePricesExpired()) {
        console[getLogLevel(true)]("Marketplace prices are expired, checking if user is authorized");
        // check if user is authorized
        await repository.refreshUserAuthStatus();
        const authStatus = await repository.getCachedUserAuthStatus();
        if (!authStatus.authorized) {
            console[getLogLevel(true)]("User is not authorized, skipping price update");
            return;
        }
        // if user is authorized, update prices
        isUpdatingPrices = true;
        let updateSuccess = false;
        await repository.updateMarketplacePrices();
        await repository.loadPricesCache();
        await repository.updateCurrencyRate();
        isUpdatingPrices = false;
        updateSuccess = true;
        console[getLogLevel(true)]("Prices updated, success:", updateSuccess);
        try {
            await broadcastToSupportedTabs({
                action: 'pricesUpdated',
                success: updateSuccess
            });
        } catch (notifyError) {
            console[getLogLevel(false)]("Failed to notify tabs:", notifyError.message);
        }
    } else {
        console[getLogLevel(true)]("Marketplace prices are still valid");
    }
}