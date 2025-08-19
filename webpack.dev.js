const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.common.js');

module.exports = merge(commonConfig, {
    mode: 'development',
    devtool: 'inline-source-map',
    watch: true,
    output: {
        path: require('path').resolve(__dirname, 'dist/dev'), 
    },
    optimization: {
        minimize: false,
    },
});