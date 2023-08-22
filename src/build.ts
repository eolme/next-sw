import type {
  ServiceWorkerBuildCallback,
  ServiceWorkerBuildConfig,
  Webpack
} from './types.js';

import { default as path } from 'path';
import { default as ServiceWorkerMinify } from './minify.js';

const loader = path.resolve(__dirname, 'loader.js');

export const build = (
  webpack: Webpack,
  config: ServiceWorkerBuildConfig,
  callback: ServiceWorkerBuildCallback
) => {
  let rules;
  let treeSharking = !config.dev;

  const options = {
    minify: config.dev,
    defines: config.defines
  };

  if (typeof config.sideEffects === 'boolean') {
    rules = [{
      loader,
      sideEffects: config.sideEffects,
      options
    }];

    treeSharking = !config.sideEffects;
  } else {
    rules = [{
      loader,
      sideEffects: false,
      exclude: config.sideEffects,
      options
    }, {
      loader,
      sideEffects: true,
      options
    }];
  }

  return webpack({
    mode: config.dev ? 'development' : 'production',
    watch: config.dev,
    watchOptions: {
      aggregateTimeout: 5,
      ignored: [
        '**/public/**'
      ]
    },
    cache: {
      type: 'memory',
      cacheUnaffected: true
    },
    performance: false,
    target: 'webworker',
    entry: config.entry,
    resolve: config.resolve,
    externalsType: 'self',
    output: {
      asyncChunks: false,
      chunkLoading: false,
      chunkFormat: false,
      globalObject: 'self',
      iife: false,
      path: config.dest,
      filename: config.name
    },
    optimization: {
      splitChunks: false,
      runtimeChunk: false,
      concatenateModules: true,
      mergeDuplicateChunks: true,
      innerGraph: treeSharking,
      providedExports: treeSharking,
      usedExports: treeSharking,
      minimize: !config.dev,
      minimizer: [
        ServiceWorkerMinify
      ]
    },
    module: {
      strictExportPresence: false,
      rules: [{
        test: /\.m?js/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false
        }
      }, {
        test: /\.(js|mjs|ts)$/,
        oneOf: rules
      }]
    },
    plugins: [
      config.define
    ]
  }, (err, stats) => {
    if (err) {
      // Webpack internal error
      throw err;
    }

    if (!stats) {
      // Nothing to show
      return;
    }

    return callback(stats);
  });
};
