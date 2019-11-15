const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  webpack(config, options) {
    config.resolve.alias.client = './client';
    config.resolve.alias.server = './server';
    config.resolve.alias.generated = './generated-gql';
    config.plugins.push(new ForkTsCheckerWebpackPlugin());
    // config.plugins.push(new BundleAnalyzerPlugin({ analyzerMode: 'static' }));
    return config;
  },
};
