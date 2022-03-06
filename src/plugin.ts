import type { NextConfig } from 'next';
import type {
  Configuration as WebpackConfiguration
} from 'webpack';

import { default as path } from 'path';

import { INJECT, NAME, access, clearErrorStackTrace, noop, tapPromiseDelegate } from './utils';
import { listen } from './livereload';
import { build } from './build';
import { log } from './log';

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
        log.info('skipping building service worker');

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
        log.error(`./${path.relative(process.cwd(), nextConfig.serviceWorker.entry)}`);
        console.error('ENOENT: no such file or directory');
        process.exit(2);
      }

      let _emitEvent = noop;

      if (typeof nextConfig.serviceWorker.livereload !== 'boolean') {
        if (context.dev) {
          log.info('live reloading feature is enabled by default during development');
        }

        nextConfig.serviceWorker.livereload = context.dev;
      }

      if (nextConfig.serviceWorker.livereload && context.dev) {
        // Start SSE server
        _emitEvent = listen(() => {
          log.ready('started live reloading server');
        });

        const client = path.resolve(__dirname, 'client.js');

        // Inject client
        const resolvedEntry = resolvedConfig.entry as (() => Promise<Record<string, string[]>>);

        resolvedConfig.entry = () => {
          return resolvedEntry().then((entry) => {
            const inject = entry[INJECT];

            if (!inject.includes(client)) {
              log.info('live reloading client injected');

              inject.unshift(client);
            }

            return entry;
          });
        };
      }

      // Recompilation status
      let _recompilation = false;
      let _recompilationHash: string | null | undefined = null;
      let _recompilationError = '';

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
      }, (stats) => {
        if (stats.hasErrors()) {
          const error = stats.toJson({
            all: false,
            errors: true
          }).errors![0];

          const _error = clearErrorStackTrace(error.message);

          if (_recompilationError !== _error) {
            _recompilationError = _error;

            log.error(error.moduleName!);
            console.error(_recompilationError);

            if (context.dev) {
              _emitEvent('error');
            } else {
              process.exit(1);
            }
          }
        }

        if (_recompilationHash !== stats.compilation.fullHash) {
          log.event('compiled service worker successfully');

          if (context.dev && _recompilation) {
            log.wait('reloading...');

            _emitEvent('reload');
          } else {
            _sync.resolve();
          }

          _recompilation = true;
          _recompilationHash = stats.compilation.fullHash;
        }

        // Nothing to show
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
