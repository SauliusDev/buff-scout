import { getLogLevel } from '../core/logLevel.js'
import { Item } from '../core/item.js'

// return true if we are in inventory mode
// Inventory page: 
// https://www.csgoroll.com/top-up/steam/csgo
// Store page:
// https://www.csgoroll.com/
// https://www.csgoroll.com/withdraw/csgo/p2p
export function isInventory() {
    return location.href == "https://www.csgoroll.com/top-up/steam/csgo";
}
export function isStore() {
    return location.href == "https://www.csgoroll.com/" || location.href == "https://www.csgoroll.com/withdraw/csgo/p2p";
}

export function extractItemDetails(div) {
    if (isInventory()) {
        return extractItemDetailsInventory(div);
    } else if (isStore()) {
        return extractItemDetailsStore(div);
    }
    return null;
}

export function createCustomBox(parentDiv, content, boxType = 'data', options = {}) {
    if (!parentDiv) {
        console[getLogLevel(false)]("Invalid div for createCustomBox");
        return;
    }
    
    let insertionParent, insertionPoint;
    
    if (isInventory()) {
        // For inventory items, find the .content div and insert after the last child
        const contentDiv = parentDiv.querySelector('.content');
        if (!contentDiv) {
            console[getLogLevel(false)]("Could not find .content element in inventory");
            return;
        }
        
        insertionParent = contentDiv;
        insertionPoint = null; // Will append as last child
        
        // Remove any existing custom box
        const existingBox = contentDiv.querySelector('.custom-box');
        if (existingBox) {
            existingBox.remove();
        }
    } else {
        // For store items, use the existing logic with cw-item-details
        const itemDetailsElement = parentDiv.querySelector('cw-item-details');
        if (!itemDetailsElement) {
            console[getLogLevel(false)]("Could not find cw-item-details element");
            return;
        }
        
        // Find the float range element and divider
        const floatRangeElement = itemDetailsElement.querySelector('[data-test="item-card-float-range"]');
        const dividerElement = itemDetailsElement.querySelector('.divider.w-100');
        
        if (!floatRangeElement || !dividerElement) {
            console[getLogLevel(false)]("Could not find float range or divider elements");
            return;
        }
        
        insertionParent = itemDetailsElement;
        insertionPoint = dividerElement;
        
        // Remove any existing custom box
        const existingBox = itemDetailsElement.querySelector('.custom-box');
        if (existingBox) {
            existingBox.remove();
        }
    }

    // Create the custom box
    const customBox = document.createElement('div');
    customBox.className = 'custom-box';
    
    const backgroundColor = 'rgba(29, 30, 38, 0.6)';
    const baseStyles = `
        position: relative !important;
        background-color: ${backgroundColor} !important;
        padding: 6px !important;
        border-radius: 5px !important;
        font-size: 12px !important;
        color: white !important;
        display: flex !important;
        flex-direction: column !important;
        box-sizing: border-box !important;
        z-index: 1000 !important;
        pointer-events: auto !important;
        backdrop-filter: blur(2px) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        height: auto !important;
        margin: 4px 0 !important;
        transition: opacity 0.3s ease !important;
    `;

    // Add type-specific styles
    const typeSpecificStyles = boxType === 'info' ? `
        justify-content: center !important;
        align-items: center !important;
        text-align: center !important;
    ` : '';

    customBox.style.cssText = baseStyles + typeSpecificStyles;

    // Add content based on type
    if (boxType === 'info') {
        // For info boxes, content should be a message string
        const messageContent = document.createElement('div');
        messageContent.style.cssText = `
            font-weight: bold !important;
            letter-spacing: 0.5px !important;
        `;
        messageContent.textContent = content;
        customBox.appendChild(messageContent);
    } else {
        // For data boxes, content should be HTML string
        customBox.innerHTML = content;
        
        // Style each paragraph for data boxes
        customBox.querySelectorAll("p").forEach((p, i) => {
            p.style.margin = "2px 0";
            p.style.padding = "0 6px";
            p.style.lineHeight = "1.1";
            p.style.wordSpacing = "0px";
            p.style.letterSpacing = "0px";
            p.style.textAlign = "left";
            p.style.display = "flex";
            p.style.justifyContent = "flex-start";
            p.style.alignItems = "center";
            
            const spans = p.querySelectorAll("span");
            if (spans.length === 2) {
                spans[0].style.flexBasis = "40%";
                spans[0].style.textAlign = "left";
                spans[0].style.padding = "0 4px";
                spans[0].style.alignItems = "center";
                spans[0].style.display = "flex";
                spans[1].style.flexBasis = "60%";
                spans[1].style.textAlign = "center";
                spans[1].style.padding = "0 4px";
                spans[1].style.alignItems = "center";
                spans[1].style.display = "flex";
                spans[1].style.justifyContent = "center";
                
                // Color coding: ratio and supply in green, others default
                if (i === 0 || i === 1) {
                    spans[1].style.color = "#46ab6b";
                    spans[1].style.fontWeight = "bold";
                } else if (i === 4 || i === 5) {
                    spans[1].style.color = "white";
                    spans[1].style.fontWeight = "";
                } else {
                    spans[1].style.color = "";
                    spans[1].style.fontWeight = "";
                }
            }
        });
    }

    // Insert the custom box at the appropriate location
    if (insertionPoint) {
        // For store items: insert before the divider
        insertionParent.insertBefore(customBox, insertionPoint);
    } else {
        // For inventory items: append as last child
        insertionParent.appendChild(customBox);
    }

    return customBox;
}





export function convertQualityAbbreviation(abbreviation) {
    const qualityMap = {
        'FN': 'Factory New',
        'MW': 'Minimal Wear',
        'FT': 'Field-Tested',
        'WW': 'Well-Worn',
        'BS': 'Battle-Scarred'
    };
    return qualityMap[abbreviation] || abbreviation;
}

export function extractItemDetailsStore(div) {
    let cardQuality = null;

    const floatRangeText = div.querySelector('[data-test="item-card-float-range"]')?.textContent?.trim() || null;
    if (floatRangeText) {
        const qualityMatch = floatRangeText.match(/(FN|MW|FT|WW|BS)/);
        if (qualityMatch) {
            cardQuality = qualityMatch[0];
        }
    }
    if (cardQuality) {
        cardQuality = convertQualityAbbreviation(cardQuality);
    }

    let cardFloat = div.querySelector('[data-test="item-card-float-range"]')?.textContent?.trim() || null;
    if (cardFloat) {
        cardFloat = cardFloat.replace(/(FN|MW|FT|WW|BS)\s*/, '');
    }

    let cardItemType = div.querySelector('.fs-10.fw-600.lh-16.ellipsis')?.textContent?.trim() || null;

    let cardItemName = div.querySelector('[data-test="item-name"]')?.textContent?.trim() || null;

    let phase = null;
    if (cardItemName) {
        const phaseMatch = cardItemName.match(/(Emerald|Black Pearl|Ruby|Sapphire|Phase 1|Phase 2|Phase 3|Phase 4)/);
        if (phaseMatch && isKnife(cardItemType)) {
            phase = phaseMatch[0];
            if (["Phase 1", "Phase 2", "Phase 3", "Phase 4"].includes(phase)) {
                cardItemName = cardItemName.replace(` ${phase}`, '');
            } else if (["Black Pearl", "Ruby", "Sapphire"].includes(phase)) {
                cardItemName = "Doppler";
            } else if (phase === "Emerald") {
                cardItemName = "Gamma Doppler";
            }
        }
    }

    let currencyValue = div.querySelector('[data-test="value"]')?.textContent?.trim() || null;
    if (currencyValue) {
        currencyValue = parseFloat(currencyValue.replace(/,/g, ''));
    }

    let priceDifference = div.querySelector('span.lh-16.fw-600.fs-10.ng-star-inserted')?.textContent?.trim() || "+0%";

    return new Item(cardQuality, cardFloat, cardItemType, cardItemName, currencyValue, null, priceDifference, phase, 'csgoroll', 0);
}

export function extractItemDetailsInventory(div) {
    let cardQuality = null;

    // Try to get quality from the wear indicator component
    const wearInfoElement = div.querySelector('cw-item-float-wear-info span');
    if (wearInfoElement) {
        const wearText = wearInfoElement.textContent.trim();
        const qualityMatch = wearText.match(/(FN|MW|FT|WW|BS)/);
        if (qualityMatch) {
            cardQuality = qualityMatch[0];
            cardQuality = convertQualityAbbreviation(cardQuality);
        }
    }

    // Try to extract float value from the same element
    let cardFloat = null;
    if (wearInfoElement) {
        const wearText = wearInfoElement.textContent.trim();
        const floatMatch = wearText.match(/(\d+\.\d+)/);
        if (floatMatch) {
            cardFloat = floatMatch[0];
        }
    }

    let cardItemType = div.querySelector('.fs-10.fw-600.lh-16.ellipsis')?.textContent?.trim() || null;

    let cardItemName = div.querySelector('[data-test="item-name"]')?.textContent?.trim() || null;

    let phase = null;
    if (cardItemName) {
        const phaseMatch = cardItemName.match(/(Emerald|Black Pearl|Ruby|Sapphire|Phase 1|Phase 2|Phase 3|Phase 4)/);
        if (phaseMatch && isKnife(cardItemType)) {
            phase = phaseMatch[0];
            if (["Phase 1", "Phase 2", "Phase 3", "Phase 4"].includes(phase)) {
                cardItemName = cardItemName.replace(` ${phase}`, '');
            } else if (["Black Pearl", "Ruby", "Sapphire"].includes(phase)) {
                cardItemName = "Doppler";
            } else if (phase === "Emerald") {
                cardItemName = "Gamma Doppler";
            }
        }
    }

    let currencyValue = div.querySelector('[data-test="value"]')?.textContent?.trim() || null;
    if (currencyValue) {
        currencyValue = parseFloat(currencyValue.replace(/,/g, ''));
    }

    // For inventory items, there's typically no price difference shown
    let priceDifference = "+0%";

    return new Item(cardQuality, cardFloat, cardItemType, cardItemName, currencyValue, null, priceDifference, phase, 'csgoroll', 0);
}

function isKnife(itemType) {
    const knifeTypes = [
        "Bayonet", "Flip Knife", "Gut Knife", "Karambit", "M9 Bayonet", "Huntsman Knife", 
        "Falchion Knife", "Bowie Knife", "Butterfly Knife", "Shadow Daggers", "Navaja Knife", 
        "Stiletto Knife", "Ursus Knife", "Talon Knife", "Paracord Knife", "Survival Knife", 
        "Nomad Knife", "Skeleton Knife", "Classic Knife", "Kukri Knife" 
    ];

    if (knifeTypes.some(knife => itemType.includes(knife))) {
        return true;
    }
    return false;
}

export function updateItem(
    div,
    item,
    isCoinRatioEnabled,
    coinRatioThreshold,
    isSupplyEnabled,
    supplyThreshold
) {
    console[getLogLevel(true)]("Updating item:", item);

    if (!div || !item) {
        console[getLogLevel(false)]("Invalid div or item for updateItem");
        return;
    }

    const coinRatio = item.currencyValueMarketplace && item.currencyValue ? 
        (item.currencyValueMarketplace / item.currencyValue).toFixed(2) : "-";

    const boxContent = `
        <p><span><i>Ratio:</i></span><span>${coinRatio}</span></p>
        <p><span><i>Supply:</i></span><span>${item.count || "-"}</span></p>
        <p><span><i>Price:</i></span><span>${item.currencyValueMarketplace || "-"}</span></p>
    `;
    
    createCustomBox(div, boxContent, 'data');

    const ratioValue = parseFloat(coinRatio);
    const supplyValue = item.count ? parseFloat(item.count) : null;
    
    shouldHideItem(
        isNaN(ratioValue) ? null : ratioValue,
        supplyValue,
        isCoinRatioEnabled,
        coinRatioThreshold,
        isSupplyEnabled,
        supplyThreshold,
        div
    );
}

export function removeCustomHtml() {
    const customBoxes = document.querySelectorAll('.custom-box');
    customBoxes.forEach(box => box.remove());
    console[getLogLevel(true)](`Removed ${customBoxes.length} custom boxes`);
}

export function unHideAllItems() {
    const filteredStoreItems = document.querySelectorAll('cw-csgo-market-item-card-wrapper[style*="background-color"]');
    const filteredInventoryItems = document.querySelectorAll('cw-csgo-market-item-card[style*="background-color"]');
    filteredStoreItems.forEach(item => {
        item.style.backgroundColor = "";
        item.style.opacity = "";
        item.style.display = "";
        item.style.filter = "";
        item.style.pointerEvents = "";
        item.style.transition = "";
    });
    filteredInventoryItems.forEach(item => {
        item.style.backgroundColor = "";
        item.style.opacity = "";
        item.style.display = "";
        item.style.filter = "";
        item.style.pointerEvents = "";
        item.style.transition = "";
    });
    console[getLogLevel(true)](`Reset ${filteredStoreItems.length + filteredInventoryItems.length} filtered items`);
}

function shouldHideItem(ratioValue, supplyValue, isCoinRatioEnabled, coinRatioThreshold, isSupplyEnabled, supplyThreshold, itemWrapper) {
    let shouldHide = false;
    if (isCoinRatioEnabled && (ratioValue === null || ratioValue < coinRatioThreshold)) {
        shouldHide = true;
    }
    if (isSupplyEnabled && (supplyValue === null || supplyValue < supplyThreshold)) {
        shouldHide = true;
    }
    if (itemWrapper) {
        itemWrapper.style.transition = "all 0.3s ease";
        if (shouldHide) {
            itemWrapper.style.backgroundColor = "#000";
            itemWrapper.style.opacity = "0.05";
            itemWrapper.style.filter = "grayscale(100%) blur(1px)";
            itemWrapper.style.pointerEvents = "none";
        } else {
            itemWrapper.style.backgroundColor = "";
            itemWrapper.style.opacity = "1";
            itemWrapper.style.filter = "none";
            itemWrapper.style.pointerEvents = "auto";
        }
    }
}

export function updateVisibilityByFilters(
    isCoinRatioEnabled,
    coinRatioThreshold,
    isSupplyEnabled,
    supplyThreshold
) {
    const allCustomBoxes = document.querySelectorAll('.custom-box');
    allCustomBoxes.forEach((box, idx) => {
        let ratioValue = null;
        let supplyValue = null;
        const paragraphs = box.querySelectorAll('p');
        paragraphs.forEach((p) => {
            const spans = p.querySelectorAll('span');
            if (!spans || spans.length < 2) return;
            const label = spans[0].textContent.replace(/[\s:]/g, '').toLowerCase();
            if (label.includes('ratio')) {
                const rawValue = spans[1].textContent.trim();
                const parsed = parseFloat(rawValue);
                if (!isNaN(parsed)) ratioValue = parsed;
            }
            if (label.includes('supply')) {
                const rawValue = spans[1].textContent.trim().replace('%', '');
                const parsed = parseFloat(rawValue);
                if (!isNaN(parsed)) supplyValue = parsed;
            }
        });

        let itemWrapper;
        if (!isInventory()) {
            itemWrapper = box.closest('cw-csgo-market-item-card-wrapper');
        } else {
            itemWrapper = box.closest('cw-csgo-market-item-card');
        }
        if (!itemWrapper) return;

        shouldHideItem(
            isNaN(ratioValue) ? null : ratioValue,
            supplyValue,
            isCoinRatioEnabled,
            coinRatioThreshold,
            isSupplyEnabled,
            supplyThreshold,
            itemWrapper
        );
    });
}