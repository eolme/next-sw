import type {
  webpack as WebpackFunction,
  WebpackPluginInstance,
  Stats as WebpackStats
} from 'webpack';

import { default as path } from 'path';

import { dynamic } from './utils';
import { default as ServiceWorkerMinify } from './minify';

type ServiceWorkerBuildConfig = {
  dev: boolean;
  name: string;
  entry: string;
  public: string;
  define: WebpackPluginInstance;
};

type ServiceWorkerBuildCallback = (stats: WebpackStats) => void;

export const build = (config: ServiceWorkerBuildConfig, callback: ServiceWorkerBuildCallback) => {
  const webpack: typeof WebpackFunction = dynamic('next/dist/compiled/webpack')().webpack;

  return webpack({
    mode: config.dev ? 'development' : 'production',
    watch: config.dev,
    watchOptions: {
      aggregateTimeout: 5,
      ignored: [
        '**/public/**',
        '**/node_modules/**'
      ]
    },
    cache: {
      type: 'memory',
      cacheUnaffected: true
    },
    performance: false,
    target: 'webworker',
    entry: config.entry,
    resolve: {
      extensions: ['.js', '.mjs', '.ts'],
      mainFields: ['module', 'main']
    },
    externalsType: 'self',
    output: {
      asyncChunks: false,
      chunkLoading: false,
      chunkFormat: false,
      enabledChunkLoadingTypes: [],
      globalObject: 'self',
      iife: false,
      path: config.public,
      filename: config.name
    },
    optimization: {
      splitChunks: false,
      runtimeChunk: false,
      concatenateModules: !config.dev,
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
        use: {
          loader: path.resolve(__dirname, 'loader.js'),
          options: {
            minify: config.dev
          }
        }
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
