import type {
  webpack as OriginalWebpack,
  WebpackPluginFunction,
  WebpackPluginInstance,
  Stats as WebpackStats
} from 'webpack';

import { default as path } from 'path';

import { dynamic } from './utils';
import { default as ServiceWorkerMinify } from './minify';

type ServiceWorkerBuildConfig = {
  dev: boolean;
  entry: string;
  public: string;
  define: WebpackPluginInstance | WebpackPluginFunction;
};

type ServiceWorkerBuildCallback = (err: Error | undefined, stats: WebpackStats | undefined) => void;

export const build = (config: ServiceWorkerBuildConfig, callback: ServiceWorkerBuildCallback) => {
  const webpack: typeof OriginalWebpack = dynamic('next/dist/compiled/webpack')().webpack;

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
      globalObject: 'self',
      iife: false,
      path: config.public,
      filename: 'sw.js'
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
        test: /\.(js|mjs|jsx|ts|tsx)$/,
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
  }, callback);
};
