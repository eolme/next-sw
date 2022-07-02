import type {
  webpack as WebpackFunction,
  WebpackPluginInstance,
  ResolveOptions as WebpackResolveOptions,
  Stats as WebpackStats
} from 'webpack';

import { default as path } from 'path';

import { log } from './log';
import { dynamic } from './utils';
import { default as ServiceWorkerMinify } from './minify';

type ServiceWorkerBuildConfig = {
  dev: boolean;
  name: string;
  entry: string;
  public: string;
  define: WebpackPluginInstance;
  resolve: WebpackResolveOptions;
};

type ServiceWorkerBuildCallback = (stats: WebpackStats) => void;

let webpack: typeof WebpackFunction;

try {
  webpack = dynamic('next/dist/compiled/bundle5')().webpack;
} catch {
  webpack = dynamic('webpack');
}
if ('version' in webpack) {
  const version = (webpack as any).version.split('.').map((num: string) => Number(num));

  if (version[0] !== 5 || version[1] < 64) {
    log.error(`next-sw depends on webpack@5.64 but only webpack@${version[0]}.${version[1]} was found`);
    process.exit(2);
  }
}

export const build = (config: ServiceWorkerBuildConfig, callback: ServiceWorkerBuildCallback) => {
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
      concatenateModules: !config.dev,
      mergeDuplicateChunks: !config.dev,
      innerGraph: !config.dev,
      providedExports: !config.dev,
      usedExports: !config.dev,
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
