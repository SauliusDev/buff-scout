export async function fetchCurrencyRate(currency) {
    const url = `https://currency-api.pages.dev/v1/currencies/${currency}.json`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}

