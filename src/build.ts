import type {
  ServiceWorkerBuildCallback,
  ServiceWorkerBuildConfig,
  WebpackCompiler,
  WebpackFunction
} from './types';

import { default as path } from 'path';

import { log } from './log';
import { dynamic } from './utils';
import { default as ServiceWorkerMinify } from './minify';

let webpack: WebpackFunction;

try {
  webpack = dynamic('next/dist/compiled/bundle5')().webpack;
} catch {
  webpack = dynamic('webpack');
}
if ('version' in webpack) {
  const version = (webpack as any).version.split('.').map(Number);

  if (version[0] !== 5 || version[1] < 64) {
    log.error(`next-sw depends on webpack@5.64 but only webpack@${version[0]}.${version[1]} was found`);
    process.exit(2);
  }
}

const loader = path.resolve(__dirname, 'loader.js');

export const build = (config: ServiceWorkerBuildConfig, callback: ServiceWorkerBuildCallback): WebpackCompiler => {
  let rules;
  let treeSharking = !config.dev;

  if (typeof config.sideEffects === 'boolean') {
    rules = [{
      loader,
      sideEffects: config.sideEffects,
      options: {
        minify: config.dev
      }
    }];

    treeSharking = !config.sideEffects;
  } else {
    rules = [{
      loader,
      sideEffects: false,
      exclude: config.sideEffects,
      options: {
        minify: config.dev
      }
    }, {
      loader,
      sideEffects: true,
      options: {
        minify: config.dev
      }
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
      path: config.public,
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
