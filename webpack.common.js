const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        background: './src/background/background.js',
        csgoRoll: './src/content/csgoRoll.js',
        csgoRollParser: './src/content/csgoRollParser.js',
        csgoEmpire: './src/content/csgoEmpire.js',
        csgoEmpireParser: './src/content/csgoEmpireParser.js',
        item: './src/core/item.js',
        currencyRateAPI: './src/api/currencyRateAPI.js',
        buffScoutAPI: './src/api/buffScoutAPI.js',
        steamAPI: './src/api/steamAPI.js',
        currencyEnum: './src/core/currencyEnum.js',
        dataParser: './src/core/dataParser.js',
        currencyRateDataParser: './src/core/currencyRateDataParser.js',
        repository: './src/repository/repository.js',
        storageUtil: './src/core/storageUtil.js',
        popup: './src/popup/popup.js',
        settings: './src/settings/settings.js',
    },
    output: {
        filename: '[name].js',
        clean: true, 
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: 'static' }],
        }),
    ],
};