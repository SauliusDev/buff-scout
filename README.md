# Buff Scout

Buff Scout overlays live Buff market data onto each skin on CSGO Roll, giving you quick insights without extra clicks.

## 

## Features
- Coin Ratio: Buff price ÷ Roll coin price
- Supply: Number of Buff listings
- Price: Current lowest ask
- Filters: Hide skins below chosen ratio/supply

## Community
Join our [Discord server](https://discord.com/invite/BzQQYRQgGy) to ask questions, report bugs, or suggest features.

## Website
Visit [buffscout.com](https://buffscout.com/) for more information.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/SauliusDev/buff-scout.git
   cd buff-scout
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build:dev
   
   or

   npm run build:prod
   ```

4. Load it in your browser:
   - **Chrome**: go to `chrome://extensions`, enable Developer Mode, click *Load unpacked*, and select the `dist/prod_open` folder.

## License
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)