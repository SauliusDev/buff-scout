import { convertCurrency } from './currencyRateDataParser.js';
import { Item } from './item.js';
import { getLogLevel } from './logLevel.js';

export function updateItemObjectByID(cachedItem, item, currencyJson, currencyFrom, currencyTo) {
    // The cachedItem already has the price in dollars (itemData.price/100)
    // Now we just need to convert from USD to EUR
    const convertedPrice = parseFloat(convertCurrency(currencyJson, currencyFrom, currencyTo, cachedItem.currencyValueMarketplace).toFixed(2));
    
    item.currencyValueMarketplace = convertedPrice;
    item.count = cachedItem.count;
    item.calculatePriceDifference();
}

export function findItemIDByFormattedName(marketplaceData, formattedName) {
    try {
        if (marketplaceData?.items) {
            if (marketplaceData.items[formattedName]) {
                return marketplaceData.items[formattedName].buff163_goods_id;
            }
        }
        console[getLogLevel(false)]("Item not found in marketplace data.");
        return null;
    } catch (error) {
        console[getLogLevel(false)]("Error retrieving marketplace data from storage:", error);
        return null;
    }
}

export function convertObjectToItem(itemData) {
    return new Item(
        itemData._cardQuality,
        itemData._cardFloat,
        itemData._cardItemType,
        itemData._cardItemName,
        itemData._currencyValue,
        itemData._currencyValueMarketplace,
        itemData._priceDifference,
        itemData._phase,
        itemData._site,
        itemData._count
    );
}