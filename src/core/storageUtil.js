import { getLogLevel } from '../core/logLevel.js';
import { Item } from '../core/item.js';

let pricesCache;

export async function loadPricesCache() {
    pricesCache = await getMarketplacePrices();
}

export async function saveToLocalStorage(key, data) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: data }, function() {
            if (chrome.runtime.lastError) {
                console[getLogLevel(false)](`Error saving ${key} to local storage: `, chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console[getLogLevel(true)](`${key} saved to local storage: `, data);
                resolve();
            }
        });
    });
}

export async function getFromLocalStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, function(result) {
            if (chrome.runtime.lastError) {
                console[getLogLevel(false)](`Error retrieving ${key} from local storage:`, chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console[getLogLevel(true)](`${key} retrieved from local storage: `, result[key]);
                resolve(result[key]);
            }
        });
    });
}

export async function saveMarketplacePrices(data) {
    return await saveToLocalStorage('marketplacePrices', data);
}

export async function getMarketplacePrices() {
    return await getFromLocalStorage('marketplacePrices');
}

export async function saveCurrencyRateData(data) {
    return await saveToLocalStorage('currencyRateData', data);
}

export async function getCurrencyRateData() {
    return await getFromLocalStorage('currencyRateData');
}

export async function getItemCache(formattedName) {
    console[getLogLevel(true)](`Fetching item cache for ${formattedName}`);

    // Updated to use 'items' instead of 'data'
    const itemData = pricesCache?.items?.[formattedName];

    if (!pricesCache || !pricesCache.items || !itemData) {
        console[getLogLevel(true)](`Prices not found for ${formattedName}`);
        return null;
    }

    const item = new Item(
        null, // cardQuality
        null, // cardFloat
        null, // cardItemType
        null, // cardItemName
        null, // currencyValue
        itemData.price/100 || 0, // currencyValueMarketplace
        null, // priceDifference
        null, // phase
        null, // site
        itemData.count || 0 // count
    );
    
    return item;
}

export async function getLastPricesLoadTimeCache() {
    if (!pricesCache || !pricesCache.timestamp_local) {
        console[getLogLevel(false)]("Prices not found");
        return null;
    }
    const date = new Date(parseInt(pricesCache.timestamp_local));
    console[getLogLevel(true)]("Last prices load time cache:", date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export async function saveCoinRatio(coinRatio) {
    return await saveToLocalStorage('coinRatio', coinRatio);
}

export async function getCoinRatio() {
    return await getFromLocalStorage('coinRatio');
}

export async function saveHideItemsBelowCoinRatio(state) {
    return await saveToLocalStorage('hideItemsBelowCoinRatio', state);
}

export async function getHideItemsBelowCoinRatio() {
    return await getFromLocalStorage('hideItemsBelowCoinRatio');
}

export async function saveSupply(supply) {
    console[getLogLevel(true)](`Saving supply: ${supply}`);
    return await saveToLocalStorage('supply', supply);
}

export async function getSupply() {
    console[getLogLevel(true)](`Getting supply`);
    return await getFromLocalStorage('supply');
}

export async function saveHideItemsBelowSupply(state) {
    return await saveToLocalStorage('hideItemsBelowSupply', state);
}

export async function getHideItemsBelowSupply() {
    return await getFromLocalStorage('hideItemsBelowSupply');
}

export async function saveEnableExtension(state) {
    return await saveToLocalStorage('enableExtension', state);
}

export async function getEnableExtension() {
    return await getFromLocalStorage('enableExtension');
}

export async function saveInstanceId(instanceId) {
    return await saveToLocalStorage('instanceId', instanceId);
}

export async function getInstanceId() {
    return await getFromLocalStorage('instanceId');
}

// Steam profile storage functions
export async function saveSteamProfile(steamProfile) {
    console.log("Saving Steam profile to storage:", steamProfile);
    const result = await saveToLocalStorage('steamProfile', steamProfile);
    console.log("Steam profile save completed");
    return result;
}

export async function getSteamProfile() {
    console.log("Getting Steam profile from storage...");
    const profile = await getFromLocalStorage('steamProfile');
    console.log("Raw Steam profile from storage:", profile);
    
    // Ensure we return null if no profile exists or profile is invalid
    const validProfile = (profile && profile.steam_id) ? profile : null;
    console.log("Valid Steam profile result:", validProfile);
    return validProfile;
}

export async function clearSteamProfile() {
    console.log("Clearing Steam profile from storage...");
    
    try {
        // Use chrome.storage.local.remove to completely remove the key
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove(['steamProfile'], function() {
                if (chrome.runtime.lastError) {
                    console.error(`Error clearing steamProfile from storage: `, chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log(`✅ steamProfile successfully removed from storage`);
                    
                    // Double-check it was removed
                    chrome.storage.local.get(['steamProfile'], function(result) {
                        console.log("Verification - steamProfile after removal:", result.steamProfile);
                        if (result.steamProfile) {
                            console.warn("WARNING: steamProfile still exists after removal attempt!");
                        }
                        resolve();
                    });
                }
            });
        });
    } catch (error) {
        console.error('Error in clearSteamProfile:', error);
        // Fallback to setting null
        console.log('Attempting fallback clear method...');
        return await saveToLocalStorage('steamProfile', null);
    }
}

// Logout intent flag storage functions
export async function setSteamLogoutIntent(value) {
    console.log("Setting Steam logout intent to:", value);
    return await saveToLocalStorage('steamLogoutIntent', value);
}

export async function getSteamLogoutIntent() {
    const intent = await getFromLocalStorage('steamLogoutIntent');
    console.log("Retrieved Steam logout intent:", intent);
    return intent || false;
}

export async function clearSteamLogoutIntent() {
    console.log("Clearing Steam logout intent");
    return await saveToLocalStorage('steamLogoutIntent', false);
}

// Auth status storage functions
export async function saveAuthStatus(authStatus) {
    console[getLogLevel(true)]("Saving auth status to storage:", authStatus);
    return await saveToLocalStorage('authStatus', authStatus);
}

export async function getAuthStatus() {
    console[getLogLevel(true)]("Getting auth status from storage");
    return await getFromLocalStorage('authStatus');
}

export async function clearAuthStatus() {
    console[getLogLevel(true)]("Clearing auth status from storage");
    return await saveToLocalStorage('authStatus', null);
}