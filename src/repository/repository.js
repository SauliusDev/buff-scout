import { getLogLevel } from '../core/logLevel.js';
import { fetchCurrencyRate } from '../api/currencyRateAPI.js';
import { Currency } from '../core/currencyEnum.js';
import { updateItemObjectByID } from '../core/dataParser.js';
import * as StorageUtil from '../core/storageUtil.js';
import { StatusEnum } from '../core/StatusEnum.js';
import * as buffScoutAPI from '../api/buffScoutAPI.js';
import * as steamAPI from '../api/steamAPI.js';

export async function updateMarketplacePrices() {
    const instanceId = await getInstanceId();
    const steamProfileId = await getSteamProfileId();
    const marketplaceData = await buffScoutAPI.getPrices(instanceId, steamProfileId);
    marketplaceData.timestamp_local = Date.now();
    await StorageUtil.saveMarketplacePrices(marketplaceData);
    return;
}

export async function updateCurrencyRate() {
    const selectedCurrency = Currency.EUR;

    const cachedCurrencyData = await StorageUtil.getCurrencyRateData();
    const today = new Date().toISOString().split('T')[0]; // Get "YYYY-MM-DD"

    if (cachedCurrencyData?.date === today) {
        console[getLogLevel(true)]("Using cached currency rate data.");
        return;
    }

    console[getLogLevel(true)]("Fetching new currency rate data...");
    const currencyRateData = await fetchCurrencyRate(selectedCurrency);
    await StorageUtil.saveCurrencyRateData(currencyRateData);
}

export async function getItemDataByID(item) {
    const cachedItem = await StorageUtil.getItemCache(item.getFormattedName());
    if (!cachedItem) {
        console[getLogLevel(false)](`No cached data found for item: ${item.getFormattedName()}`);
        throw new Error(StatusEnum.ITEM_NOT_FOUND);
    }
    if (cachedItem) {
        console[getLogLevel(true)](`Cached data found for item: ${item.getFormattedName()}`);
        const currencyRateData = await StorageUtil.getCurrencyRateData();
        if (!currencyRateData) throw new Error(StatusEnum.NO_CURRENCY_RATE);
        updateItemObjectByID(cachedItem, item, currencyRateData, Currency.USD, Currency.EUR);
    } else {
        // Cache not available - this could be due to uninitialized cache or no data for this item
        console[getLogLevel(false)](`No cached data found for item: ${item.getFormattedName()}`);
        throw new Error(StatusEnum.PRICES_EXPIRED);
    }
}

export async function saveCoinRatio(coinRatio) {
    await StorageUtil.saveCoinRatio(coinRatio);
}

export async function getCoinRatio() {
    return await StorageUtil.getCoinRatio();
}

export async function saveHideItemsBelowCoinRatio(state) {
    await StorageUtil.saveHideItemsBelowCoinRatio(state);
}

export async function getHideItemsBelowCoinRatio() {
    return await StorageUtil.getHideItemsBelowCoinRatio();
}

export async function saveSupply(supply) {
    await StorageUtil.saveSupply(supply);
}

export async function getSupply() {
    return await StorageUtil.getSupply();
}

export async function saveHideItemsBelowSupply(state) {
    await StorageUtil.saveHideItemsBelowSupply(state);
}

export async function getHideItemsBelowSupply() {
    return await StorageUtil.getHideItemsBelowSupply();
}

export async function saveEnableExtension(state) {
    await StorageUtil.saveEnableExtension(state);
}

export async function getEnableExtension() {
    return await StorageUtil.getEnableExtension();
}

export async function initializeInstanceId() {
    let instanceId = await getInstanceId();
    if (!instanceId) {
        instanceId = crypto.randomUUID();
        await StorageUtil.saveInstanceId(instanceId);
        console[getLogLevel(true)]("Generated and stored new instance ID:", instanceId);
    } else {
        console[getLogLevel(true)]("Instance ID already exists:", instanceId);
    }
}

export async function areMarketplacePricesExpired() {
    // Check if marketplace prices need updating: 
    // Fetch the last update time, and if no update exists or it's older than 3 hours the prices are expired
    const lastUpdate = await StorageUtil.getLastPricesLoadTimeCache()
    if (!lastUpdate) {
        console[getLogLevel(true)]("No last update time found, prices are considered expired.");
        return true;
    }
    // 1 hour for pro, 24 hours for free
    // also handled in the api so if free user would request for that days prices it would return the same old json
    const authStatus = await getCachedUserAuthStatus();
    if (authStatus.plan === 'Free') {
        const threeHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); 
        return !lastUpdate || new Date(lastUpdate) < threeHoursAgo;
    } else {
        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000); 
        return !lastUpdate || new Date(lastUpdate) < oneHourAgo;
    }
}

export async function loadPricesCache() {
    return await StorageUtil.loadPricesCache();
}

export async function saveInstanceId(instanceId) {
    await StorageUtil.saveInstanceId(instanceId);
}

export async function getInstanceId() {
    return await StorageUtil.getInstanceId();
}

// Steam authentication functions
export async function saveSteamProfile(steamProfile) {
    await StorageUtil.saveSteamProfile(steamProfile);
}

export async function getSteamProfile() {
    return await StorageUtil.getSteamProfile();
}

export async function clearSteamProfile() {
    await StorageUtil.clearSteamProfile();
}

export async function getSteamProfileId() {
    const steamProfile = await getSteamProfile();
    return steamProfile?.steam_id || null;
}

// Steam logout intent functions
export async function setSteamLogoutIntent(value) {
    await StorageUtil.setSteamLogoutIntent(value);
}

export async function getSteamLogoutIntent() {
    return await StorageUtil.getSteamLogoutIntent();
}

export async function clearSteamLogoutIntent() {
    await StorageUtil.clearSteamLogoutIntent();
}

export async function checkUserAuthStatus() {
    const instanceId = await getInstanceId();
    const steamProfileId = await getSteamProfileId();
    
    try {
        const authResponse = await buffScoutAPI.authCheck(instanceId, steamProfileId);
        return authResponse;
    } catch (error) {
        console[getLogLevel(false)]('Error checking user auth status:', error);
        return { authorized: false, plan: 'Free' };
    }
}

export async function activateLicense(licenseKey) {
    if (!licenseKey) {
        throw new Error(StatusEnum.LICENSE_KEY_MISSING);
    }
    
    const steamProfileId = await getSteamProfileId();
    if (!steamProfileId) {
        throw new Error('Steam profile ID is required for license activation. Please sign in with Steam first.');
    }
    
    return await buffScoutAPI.activateLicense(licenseKey, steamProfileId);
}

export async function getSteamUserProfile() {
    return await steamAPI.getSteamUserProfile();
}

export async function checkSteamLogin() {
    return await steamAPI.checkSteamLogin();
}

// New Steam authentication functions using BuffScout API
export async function steamSignIn(steamProfile) {
    const instanceId = await getInstanceId();
    
    if (!steamProfile || !steamProfile.steam_id) {
        throw new Error('Valid Steam profile is required for sign in');
    }
    
    try {
        const response = await buffScoutAPI.steamSignIn(
            steamProfile.steam_id,
            instanceId,
            steamProfile.username || steamProfile.display_name,
            steamProfile.email,
            steamProfile.avatar_url || steamProfile.avatar
        );
        
        if (response && response.success) {
            await saveSteamProfile(steamProfile);
        }
        
        return response;
    } catch (error) {
        console[getLogLevel(false)]('Error signing in with Steam:', error);
        throw error;
    }
}

export async function steamSignOut() {
    const instanceId = await getInstanceId();
    const steamProfileId = await getSteamProfileId();
    
    if (!steamProfileId) {
        console[getLogLevel(true)]('No Steam profile to sign out from');
        return { success: true, message: 'Already signed out' };
    }
    
    try {
        const response = await buffScoutAPI.steamSignOut(steamProfileId, instanceId);
        
        // Clear local Steam profile after successful API sign out
        await clearSteamProfile();
        
        return response;
    } catch (error) {
        console[getLogLevel(false)]('Error signing out from Steam:', error);
        // Still clear local profile even if API call fails
        await clearSteamProfile();
        throw error;
    }
}

// Cached auth status functions
export async function saveUserAuthStatus(authStatus) {
    await StorageUtil.saveAuthStatus(authStatus);
}

export async function getCachedUserAuthStatus() {
    const cachedAuth = await StorageUtil.getAuthStatus();
    if (cachedAuth) {
        return cachedAuth;
    }
    // If no cached auth, return default unauthorized state
    return { authorized: false, plan: 'Free' };
}

export async function clearUserAuthStatus() {
    await StorageUtil.clearAuthStatus();
}

export async function refreshUserAuthStatus() {
    const instanceId = await getInstanceId();
    const steamProfileId = await getSteamProfileId();
    
    try {
        const authResponse = await buffScoutAPI.authCheck(instanceId, steamProfileId);
        await saveUserAuthStatus(authResponse);
        return authResponse;
    } catch (error) {
        console[getLogLevel(false)]('Error refreshing user auth status:', error);
        const defaultAuth = { authorized: false, plan: 'Free' };
        await saveUserAuthStatus(defaultAuth);
        return defaultAuth;
    }
}
