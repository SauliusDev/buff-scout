import { getLogLevel } from '../core/logLevel.js'
import { Item } from '../core/item.js'

// Page detection functions
export function isMarketplace() {
    // CSGOEmpire marketplace/store pages
    return window.location.href.includes('csgoempire.com') && 
           (window.location.pathname === '/' || 
            window.location.pathname.startsWith('/trading') ||
            window.location.pathname.startsWith('/shop'));
}

export function isInventory() {
    // CSGOEmpire inventory/deposit pages
    return window.location.href.includes('csgoempire.com') && 
           (window.location.pathname.startsWith('/deposit') ||
            window.location.pathname.startsWith('/withdraw'));
}

export function extractItemDetails(div) {
    console[getLogLevel(true)]("Extracting item details from CSGOEmpire item card");
    
    try {
        // Extract quality from the quality indicator
        let cardQuality = null;
        const qualityElement = div.querySelector('[data-testid="item-card-quality"]');
        if (qualityElement) {
            cardQuality = qualityElement.textContent.trim();
            cardQuality = convertQualityAbbreviation(cardQuality);
        }

        // Extract float value
        let cardFloat = null;
        const floatElements = div.querySelectorAll('.size-small');
        for (const element of floatElements) {
            const text = element.textContent.trim();
            const floatMatch = text.match(/~(\d+\.\d+)/);
            if (floatMatch) {
                cardFloat = floatMatch[1];
                break;
            }
        }

        // Extract item type and name
        let cardItemType = null;
        let cardItemName = null;
        
        const itemTypeElement = div.querySelector('[data-testid="item-card-item-type"]');
        const itemNameElement = div.querySelector('[data-testid="item-card-item-name"]');
        
        if (itemTypeElement) {
            cardItemType = itemTypeElement.textContent.trim();
        }
        if (itemNameElement) {
            cardItemName = itemNameElement.textContent.trim();
        }

        // Extract phase for Doppler knives
        let phase = null;
        if (cardItemName) {
            const phaseMatch = cardItemName.match(/(Emerald|Black Pearl|Ruby|Sapphire|Phase 1|Phase 2|Phase 3|Phase 4)/);
            if (phaseMatch && isKnife(cardItemType)) {
                phase = phaseMatch[0];
                if (["Phase 1", "Phase 2", "Phase 3", "Phase 4"].includes(phase)) {
                    cardItemName = cardItemName.replace(new RegExp(`\\s*-\\s*${phase}`), '');
                } else if (["Black Pearl", "Ruby", "Sapphire"].includes(phase)) {
                    cardItemName = "Doppler";
                } else if (phase === "Emerald") {
                    cardItemName = "Gamma Doppler";
                }
                cardItemName = cardItemName.trim().replace(/[-–]\s*$/, '');
            }
        }

        // Extract price
        let currencyValue = null;
        const priceElement = div.querySelector('[data-testid="item-card-next-offer-price"] [data-testid="currency-value"]');
        if (priceElement) {
            const priceText = priceElement.textContent.trim().replace(/,/g, '');
            currencyValue = parseFloat(priceText);
        }

        // Extract price percentage (if available)
        let priceDifference = "+0%";
        const percentElement = div.querySelector('[data-testid="real-price-percent"] p');
        if (percentElement) {
            priceDifference = percentElement.textContent.trim();
        }

        console[getLogLevel(true)]("Extracted CSGOEmpire item:", {
            quality: cardQuality,
            float: cardFloat,
            type: cardItemType,
            name: cardItemName,
            price: currencyValue,
            phase: phase
        });

        return new Item(cardQuality, cardFloat, cardItemType, cardItemName, currencyValue, null, priceDifference, phase, 'csgoempire', 0);
        
    } catch (error) {
        console[getLogLevel(false)]("Error extracting CSGOEmpire item details:", error);
        return null;
    }
}

export function createCustomBox(parentDiv, content, boxType = 'data', options = {}) {
    if (!parentDiv) {
        console[getLogLevel(false)]("Invalid div for createCustomBox");
        return;
    }
    
    console[getLogLevel(true)]("Creating custom box for CSGOEmpire item");
    
    try {
        const bottomArea = parentDiv.querySelector('[data-testid="item-card-bottom-area"]');
        if (!bottomArea) {
            console[getLogLevel(false)]("Could not find bottom area in CSGOEmpire item card");
            return;
        }

        const existingBox = bottomArea.querySelector('.custom-box');
        if (existingBox) {
            existingBox.remove();
        }

        const customBox = document.createElement('div');
        customBox.className = 'custom-box';
        
        const backgroundColor = 'rgba(29, 30, 38, 0.8)';
        const baseStyles = `
            position: relative !important;
            background-color: ${backgroundColor} !important;
            padding: 8px !important;
            border-radius: 6px !important;
            font-size: 11px !important;
            color: white !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            z-index: 1000 !important;
            pointer-events: auto !important;
            backdrop-filter: blur(2px) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            margin: 6px 0 4px 0 !important;
            transition: opacity 0.3s ease !important;
        `;

        const typeSpecificStyles = boxType === 'info' ? `
            justify-content: center !important;
            align-items: center !important;
            text-align: center !important;
        ` : '';

        customBox.style.cssText = baseStyles + typeSpecificStyles;

        if (boxType === 'info' || boxType === 'error') {
            const messageContent = document.createElement('div');
            messageContent.style.cssText = `
                font-weight: bold !important;
                letter-spacing: 0.5px !important;
                text-align: center !important;
                color: ${boxType === 'error' ? '#ff6b6b' : 'white'} !important;
            `;
            messageContent.textContent = content;
            customBox.appendChild(messageContent);
        } else {
            customBox.innerHTML = content;
            
            customBox.querySelectorAll("p").forEach((p, i) => {
                p.style.margin = "2px 0";
                p.style.padding = "0 4px";
                p.style.lineHeight = "1.2";
                p.style.wordSpacing = "0px";
                p.style.letterSpacing = "0px";
                p.style.textAlign = "left";
                p.style.display = "flex";
                p.style.justifyContent = "space-between";
                p.style.alignItems = "center";
                
                const spans = p.querySelectorAll("span");
                if (spans.length === 2) {
                    spans[0].style.flexBasis = "45%";
                    spans[0].style.textAlign = "left";
                    spans[0].style.fontWeight = "500";
                    spans[1].style.flexBasis = "55%";
                    spans[1].style.textAlign = "right";
                    spans[1].style.fontWeight = "bold";
                    
                    if (i === 0 || i === 1) {
                        spans[1].style.color = "#10b981";
                    } else {
                        spans[1].style.color = "#e5e7eb";
                    }
                }
            });
        }

        const priceArea = bottomArea.querySelector('.flex.items-center.justify-between');
        if (priceArea) {
            const nextElement = priceArea.nextElementSibling;
            if (nextElement) {
                bottomArea.insertBefore(customBox, nextElement);
            } else {
                bottomArea.appendChild(customBox);
            }
        } else {
            bottomArea.appendChild(customBox);
        }

        return customBox;
        
    } catch (error) {
        console[getLogLevel(false)]("Error creating custom box:", error);
        return null;
    }
}

export function updateItem(
    div,
    item,
    isCoinRatioEnabled,
    coinRatioThreshold,
    isSupplyEnabled,
    supplyThreshold
) {
    console[getLogLevel(true)]("Updating CSGOEmpire item:", item);

    if (!div || !item) {
        console[getLogLevel(false)]("Invalid div or item for updateItem");
        return;
    }

    try {
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
        
    } catch (error) {
        console[getLogLevel(false)]("Error updating CSGOEmpire item:", error);
    }
}

export function removeCustomHtml() {
    const customBoxes = document.querySelectorAll('.custom-box');
    customBoxes.forEach(box => box.remove());
    console[getLogLevel(true)](`Removed ${customBoxes.length} custom boxes from CSGOEmpire`);
}

export function unHideAllItems() {
    const filteredItems = document.querySelectorAll('.item-card[style*="background-color"], .relative.rounded-lg.bg-dark-3[style*="background-color"]');
    filteredItems.forEach(item => {
        item.style.backgroundColor = "";
        item.style.opacity = "";
        item.style.display = "";
        item.style.filter = "";
        item.style.pointerEvents = "";
        item.style.transition = "";
    });
    console[getLogLevel(true)](`Reset ${filteredItems.length} filtered items on CSGOEmpire`);
}

export function updateVisibilityByFilters(
    isCoinRatioEnabled,
    coinRatioThreshold,
    isSupplyEnabled,
    supplyThreshold
) {
    console[getLogLevel(true)]("Updating CSGOEmpire item visibility by filters");
    
    const allCustomBoxes = document.querySelectorAll('.custom-box');
    allCustomBoxes.forEach((box) => {
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

        const itemWrapper = box.closest('.relative.rounded-lg.bg-dark-3') || 
                           box.closest('.item-card');
        
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

export function convertQualityAbbreviation(quality) {
    const qualityMap = {
        'FN': 'Factory New',
        'MW': 'Minimal Wear',
        'FT': 'Field-Tested',
        'WW': 'Well-Worn',
        'BS': 'Battle-Scarred',
        'Factory New': 'Factory New',
        'Minimal Wear': 'Minimal Wear',
        'Field-Tested': 'Field-Tested',
        'Well-Worn': 'Well-Worn',
        'Battle-Scarred': 'Battle-Scarred'
    };
    return qualityMap[quality] || quality;
}

function isKnife(itemType) {
    if (!itemType) return false;

    const knifeTypes = [
        "Bayonet", "Flip Knife", "Gut Knife", "Karambit", "M9 Bayonet", "Huntsman Knife", 
        "Falchion Knife", "Bowie Knife", "Butterfly Knife", "Shadow Daggers", "Navaja Knife", 
        "Stiletto Knife", "Ursus Knife", "Talon Knife", "Paracord Knife", "Survival Knife", 
        "Nomad Knife", "Skeleton Knife", "Classic Knife", "Kukri Knife", "AWP"
    ];

    return knifeTypes.some(knife => itemType.includes(knife));
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
            itemWrapper.style.backgroundColor = "#1a1b23";
            itemWrapper.style.opacity = "0.1";
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
