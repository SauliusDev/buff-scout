import { getLogLevel } from '../core/logLevel.js';

const coinRatioInput = document.getElementById('coinRatioInput');
const supplyInput = document.getElementById('supplyInput');
const supplyToggle = document.getElementById('supplyToggle');
const coinRatioToggle = document.getElementById('coinRatioToggle');
const enableExtensionToggle = document.getElementById('enableExtensionToggle');
const settingsButton = document.getElementById('settingsButton');
let toggleCooldown = false;

async function checkPremiumStatus() {
    try {
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "authCheck" }, (response) => {
                resolve(response);
            });
        });
        return response?.success && response.plan === 'Pro';
    } catch (error) {
        console[getLogLevel(false)]("Error checking premium status:", error);
        return false;
    }
}

function togglePremiumControls(hasPremium) {
    const premiumControls = [coinRatioInput, supplyInput, coinRatioToggle, supplyToggle];
    
    premiumControls.forEach(control => {
        if (control) {
            control.disabled = !hasPremium;
            if (!hasPremium) {
                control.classList.add('disabled-premium');
                if (control === coinRatioInput || control === supplyInput) {
                    control.value = '';
                }
                if (control === coinRatioToggle || control === supplyToggle) {
                    control.checked = false;
                }
            } else {
                control.classList.remove('disabled-premium');
            }
        }
    });

    // Add single premium overlay covering all filtering controls
    const mainContainer = document.getElementById('mainContainer');
    const existingOverlay = document.querySelector('.premium-filtering-overlay');
    
    if (!hasPremium) {
        if (!existingOverlay && mainContainer) {
            const premiumOverlay = document.createElement('div');
            premiumOverlay.className = 'premium-filtering-overlay';
            premiumOverlay.innerHTML = `
                <div class="premium-filtering-content">
                    <div class="premium-badge">
                        <img src="assets/dice_white_512.png" alt="Premium" width="24" height="24">
                        <span>Pro Only</span>
                    </div>
                    <div class="premium-description">
                        Unlock item filtering and better price accuracy with Pro
                    </div>
                    <a href="https://buffscout.com/pricing" target="_blank" class="premium-upgrade-link">
                        Level up
                    </a>
                </div>
            `;
            mainContainer.appendChild(premiumOverlay);
        }
    } else if (existingOverlay) {
        existingOverlay.remove();
    }
}

// Helper function to update filters in content script
function updateFiltersInContentScript() {
    const isCoinRatioEnabled = coinRatioToggle.checked;
    const coinRatioThreshold = parseFloat(coinRatioInput.value);
    const isSupplyEnabled = supplyToggle.checked;
    const supplyThreshold = parseFloat(supplyInput.value);
    chrome.runtime.sendMessage({
        action: "updateVisibilityByFilters",
        isCoinRatioEnabled: isCoinRatioEnabled,
        coinRatioThreshold: coinRatioThreshold,
        isSupplyEnabled: isSupplyEnabled,
        supplyThreshold: supplyThreshold
    });
}

async function loadPopupData() {
    try {
        const hasPremium = await checkPremiumStatus();
        
        const [
            coinRatioResponse,
            toggleStateResponse,
            supplyResponse,
            supplyToggleResponse,
            enableExtensionToggleResponse
        ] = await Promise.all([
            new Promise((resolve) => chrome.runtime.sendMessage({ action: "getCoinRatio" }, resolve)),
            new Promise((resolve) => chrome.runtime.sendMessage({ action: "getHideItemsBelowCoinRatio" }, resolve)),
            new Promise((resolve) => chrome.runtime.sendMessage({ action: "getSupply" }, resolve)),
            new Promise((resolve) => chrome.runtime.sendMessage({ action: "getHideItemsBelowSupply" }, resolve)),
            new Promise((resolve) => chrome.runtime.sendMessage({ action: "getEnableExtension" }, resolve))
        ]);

        if (hasPremium) {
            if (coinRatioResponse.success && coinRatioResponse.message !== undefined) {
                coinRatioInput.value = coinRatioResponse.message;
            }

            if (supplyResponse && supplyResponse.success && supplyResponse.message !== undefined) {
                supplyInput.value = supplyResponse.message;
            }

            if (toggleStateResponse.success && toggleStateResponse.message !== undefined) {
                coinRatioToggle.checked = toggleStateResponse.message;
            } else {
                coinRatioToggle.checked = false;
            }

            if (supplyToggleResponse && supplyToggleResponse.success && supplyToggleResponse.message !== undefined) {
                supplyToggle.checked = supplyToggleResponse.message;
            } else {
                supplyToggle.checked = false;
            }
        } else {
            coinRatioInput.value = '';
            supplyInput.value = '';
            coinRatioToggle.checked = false;
            supplyToggle.checked = false;
        }

        if (enableExtensionToggleResponse && enableExtensionToggleResponse.success && enableExtensionToggleResponse.message !== undefined) {
            enableExtensionToggle.checked = enableExtensionToggleResponse.message;
        } else {
            enableExtensionToggle.checked = false;
        }

        togglePremiumControls(hasPremium);
    } catch (error) {
        console[getLogLevel(false)]("Error loading popup data:", error);
    }
}

loadPopupData();

coinRatioInput.addEventListener('input', async () => {
    const hasPremium = await checkPremiumStatus();
    if (!hasPremium) return;
    
    const value = coinRatioInput.value;
    if (value === "") {
        chrome.runtime.sendMessage(
            { action: "saveCoinRatio", coinRatio: "" },
            (response) => {
                if (response.success) {
                    updateFiltersInContentScript();
                }
            }
        );
    } else {
        const coinRatio = parseFloat(value);
        if (!isNaN(coinRatio) && coinRatio >= 0 && coinRatio <= 1) {
            chrome.runtime.sendMessage(
                { action: "saveCoinRatio", coinRatio },
                (response) => {
                    if (response.success) {
                        updateFiltersInContentScript();
                    }
                }
            );
        }
    }
});

coinRatioToggle.addEventListener('change', async () => {
    const hasPremium = await checkPremiumStatus();
    if (!hasPremium) {
        coinRatioToggle.checked = false;
        return;
    }
    
    const state = coinRatioToggle.checked;
    chrome.runtime.sendMessage(
        { action: "saveHideItemsBelowCoinRatio", state },
        (response) => { if (response.success) { updateFiltersInContentScript(); }}
    );
});

supplyInput.addEventListener('input', async () => {
    const hasPremium = await checkPremiumStatus();
    if (!hasPremium) return;
    
    const value = supplyInput.value;
    if (value === "") {
        chrome.runtime.sendMessage(
            { action: "saveSupply", supply: "" },
            (response) => { if (response.success) { updateFiltersInContentScript(); }}
        );
    } else {
        let supply = parseFloat(value);
        if (isNaN(supply)) {
            return;
        }
        if (supply < 0) {
            supply = 0;
        } else if (supply > 10000) {
            supply = 10000;
        }
        supplyInput.value = supply;
        chrome.runtime.sendMessage(
            { action: "saveSupply", supply },
            (response) => { if (response.success) { updateFiltersInContentScript(); }}
        );
    }
});

supplyToggle.addEventListener('change', async () => {
    const hasPremium = await checkPremiumStatus();
    if (!hasPremium) {
        supplyToggle.checked = false;
        return;
    }
    
    const isSupplyEnabled = supplyToggle.checked;
    chrome.runtime.sendMessage(
        { action: "saveHideItemsBelowSupply", state: isSupplyEnabled },
        (response) => { if (response.success) { updateFiltersInContentScript(); }}
    );
});

enableExtensionToggle.addEventListener('change', () => {
    if (toggleCooldown) {
        return;
    }
    toggleCooldown = true;
    const initialState = enableExtensionToggle.checked;
    chrome.runtime.sendMessage({ action: initialState ? "enableExtension" : "disableExtension" });
    setTimeout(() => {
        const currentState = enableExtensionToggle.checked;
        if (currentState !== initialState) {
            chrome.runtime.sendMessage({ action: currentState ? "enableExtension" : "disableExtension" });
        }
        toggleCooldown = false;
    }, 1000);
});

settingsButton?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});