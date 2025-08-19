import axios from 'axios';
import { StatusEnum } from '../core/StatusEnum.js';
import { getLogLevel } from '../core/logLevel.js';

const API_URL = 'https://buffscout.com';

function buildAuthHeaders(instanceId, steamProfileId) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (instanceId) {
        headers['instanceId'] = instanceId;
    }
    
    if (steamProfileId) {
        headers['steamProfileId'] = steamProfileId;
    }
    
    return headers;
}

export async function authCheck(instanceId, steamProfileId) {
    const url = `${API_URL}/extension/auth`; 
    const headers = buildAuthHeaders(instanceId, steamProfileId);
    
    try {
        const response = await axios.get(url, { headers });
        return {
            authorized: response.data.authorized,
            plan: response.data.plan,
        };
    } catch (error) {
        if (error.response?.status === 403) {
            throw new Error(StatusEnum.ACCESS_DENIED);
        }
        console[getLogLevel(false)]('Error during authentication check:', error);
        throw error;
    }
}

export async function getPrices(instanceId, steamProfileId) {
    const url = `${API_URL}/prices`; 
    const headers = buildAuthHeaders(instanceId, steamProfileId);
    
    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        if (error.response?.status === 403) {
            throw new Error(StatusEnum.ACCESS_DENIED);
        }
        console[getLogLevel(false)]('Error fetching market data via buff scout api:', error);
        throw error;
    }
}

export async function activateLicense(licenseKey, steamProfileId) {
    const url = `${API_URL}/extension/license/activate`;
    
    if (!steamProfileId) {
        throw new Error('Steam profile ID is required for license activation');
    }
    
    try {
        const response = await axios.post(url, {
            licenseKey: licenseKey,
            steamProfileId: steamProfileId
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        console[getLogLevel(false)]('Error activating license:', error);
        throw error;
    }
}

export async function steamSignIn(steamProfileId, instanceId, name, email, avatar_url) {
    const url = `${API_URL}/extension/steam/signIn`;
    
    const payload = {
        steamProfileId: steamProfileId,
        instanceId: instanceId
    };
    
    if (name) payload.name = name;
    if (email) payload.email = email;
    if (avatar_url) payload.avatar_url = avatar_url;
    
    try {
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        console[getLogLevel(false)]('Error signing in with Steam:', error);
        throw error;
    }
}

export async function steamSignOut(steamProfileId, instanceId) {
    const url = `${API_URL}/extension/steam/signOut`;
    
    try {
        const response = await axios.post(url, {
            steamProfileId: steamProfileId,
            instanceId: instanceId
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        console[getLogLevel(false)]('Error signing out from Steam:', error);
        throw error;
    }
}