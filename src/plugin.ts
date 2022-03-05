import type { NextConfig } from 'next';
import type {
  Configuration as WebpackConfiguration
} from 'webpack';

import { default as path } from 'path';

import { INJECT, NAME, access, noop, tapPromiseDelegate } from './utils';
import { listen } from './livereload';
import { build } from './build';

type ServiceWorkerConfig = {
  entry?: string;
  livereload?: boolean;
};

type NextConfigWithServiceWorker = NextConfig & {
  serviceWorker?: ServiceWorkerConfig;
};

/**
 * Next ServiceWorker plugin
 *
 * @author Anton Petrov <eolme>
 * @see https://github.com/eolme/next-sw
 *
 * @param {NextConfigWithServiceWorker} nextConfig
 * @returns {NextConfig}
 */
export default function withServiceWorker(nextConfig: NextConfigWithServiceWorker): NextConfig {
  const nextConfigWebpack = nextConfig.webpack || ((config) => config);

  const nextConfigPlugin: NextConfig = {
    webpack(config, context) {
      const resolvedConfig: WebpackConfiguration = nextConfigWebpack(config, context);

      if (context.isServer) {
        return resolvedConfig;
      }

      if (
        typeof nextConfig.serviceWorker !== 'object' ||
        typeof nextConfig.serviceWorker.entry !== 'string'
      ) {
        console.warn('[ServiceWorker] Configuration is empty. Skipped.');

        return resolvedConfig;
      }

      // Resolve entry
      let _entry = nextConfig.serviceWorker.entry;

      if (!path.isAbsolute(_entry)) {
        _entry = path.resolve(process.cwd(), _entry);
      } else {
        _entry = path.normalize(_entry);
      }

      // Check if entry is accessible
      const _access = access(_entry);

      if (_access !== null) {
        console.error(`[ServiceWorker] Entry "${nextConfig.serviceWorker.entry}" is not accessible:`);
        throw _access;
      }

      let _emitEvent = noop;

      if (typeof nextConfig.serviceWorker.livereload !== 'boolean') {
        if (context.dev) {
          console.log('[ServiceWorker] Live Reloading enabled by default during development.');
        }

        nextConfig.serviceWorker.livereload = context.dev;
      }

      if (nextConfig.serviceWorker.livereload && context.dev) {
        // Start SSE server
        _emitEvent = listen(() => {
          console.log('[ServiceWorker] Live Reloading ready.');
        });

        const client = path.resolve(__dirname, 'client.js');

        // Inject client
        const resolvedEntry = resolvedConfig.entry as (() => Promise<Record<string, string[]>>);

        resolvedConfig.entry = () => {
          return resolvedEntry().then((entry) => {
            const inject = entry[INJECT];

            if (!inject.includes(client)) {
              inject.unshift(client);
            }

            return entry;
          });
        };
      }

      // Recompilation status
      let _recompilation = false;
      let _recompilationHash: string | null | undefined = null;

      // It is necessary to delegate state of own compilation
      const _sync = tapPromiseDelegate();

      // Resolve public folder
      const _public = path.resolve(process.cwd(), 'public');

      // Extract DefinePlugin
      const _define = resolvedConfig.plugins!.find((plugin) => plugin.constructor.name === 'DefinePlugin')!;

      build({
        dev: context.dev,
        entry: _entry,
        public: _public,
        define: _define
      }, (err, stats) => {
        if (!stats) {
          return;
        }

        if (err || stats.hasErrors()) {
          console.error('[ServiceWorker] Build failed:');

          if (context.dev) {
            console.error(stats.toString({ colors: true }));

            _emitEvent('error');
          } else if (err) {
            throw err;
          } else {
            throw new Error(stats.toString({ errors: true }));
          }
        } else if (
          _recompilationHash !== stats.compilation.fullHash
        ) {
          if (context.dev && _recompilation) {
            console.log('[ServiceWorker] Build success. Reloading...');

            _emitEvent('reload');
          } else {
            console.log('[ServiceWorker] Build success.');

            _sync.resolve();
          }

          _recompilation = true;
          _recompilationHash = stats.compilation.fullHash;
        }
      });

      // Plugin to wait for compilation
      resolvedConfig.plugins!.push({
        name: NAME,
        apply(compiler) {
          compiler.hooks.done.tapPromise(NAME, () => _sync.promise);
        }
      });

      return resolvedConfig;
    }
  };

  return Object.assign({}, nextConfig, nextConfigPlugin);
}
