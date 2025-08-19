export function convertCurrency(jsonData, currencyFrom, currencyTo, amount) {
    if (!jsonData || !jsonData.eur) {
        throw new Error("Invalid JSON data");
    }

    const rates = jsonData.eur;
    const fromRate = rates[currencyFrom.toLowerCase()];
    const toRate = rates[currencyTo.toLowerCase()];

    if (fromRate === undefined || toRate === undefined) {
        throw new Error("Invalid currency code");
    }

    const convertedAmount = (amount / fromRate) * toRate;
    return convertedAmount;
}
