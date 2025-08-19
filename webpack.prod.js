const { merge } = require('webpack-merge');
const commonConfig = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = merge(commonConfig, {
    mode: 'production',
    devtool: 'source-map',
    output: {
        path: require('path').resolve(__dirname, 'dist/prod'), // Separate dist directory for prod
    },
    optimization: {
        minimize: true, // Minify JS for production
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: true,
                    mangle: false, // Keep function/variable names readable for Chrome Web Store
                    keep_fnames: true, // Keep function names
                    keep_classnames: true, // Keep class names
                },
            }),
        ],
    },
});