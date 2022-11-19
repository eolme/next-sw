import type {
  NextConfigLoose,
  ServiceWorkerConfig,
  WebpackConfiguration,
  WebpackPluginInstance
} from './types';

import { default as path } from 'path';

import { INJECT, NAME, access, clearErrorStackTrace, noop, tapPromiseDelegate } from './utils';
import { patchResolve } from './patch';
import { listen } from './livereload';
import { build } from './build';
import { log } from './log';

/**
 * Next ServiceWorker plugin
 *
 * @author Anton Petrov <eolme>
 * @see https://github.com/eolme/next-sw
 *
 * @param {ServiceWorkerConfig} nextConfig
 * @returns {(config: NextConfigLoose) => NextConfigLoose}
 */
export default (sw: ServiceWorkerConfig) => (nextConfig: NextConfigLoose = {}): NextConfigLoose => {
  const nextConfigWebpack = nextConfig.webpack || ((config) => config);

  const nextConfigPlugin: NextConfigLoose = {
    webpack(config, context) {
      const resolvedConfig: WebpackConfiguration = nextConfigWebpack(config, context);

      if (context.isServer) {
        return resolvedConfig;
      }

      if (
        typeof sw !== 'object' || sw === null ||
        typeof sw.entry !== 'string'
      ) {
        log.info('skipping building service worker');

        return resolvedConfig;
      }

      // Resolve entry
      let _entry = sw.entry;

      if (!path.isAbsolute(_entry)) {
        _entry = path.resolve(process.cwd(), _entry);
      } else {
        _entry = path.normalize(_entry);
      }

      // Check if entry is accessible
      const _access = access(_entry);

      if (_access !== null) {
        log.error(`./${path.relative(process.cwd(), sw.entry)}`);
        console.error('ENOENT: no such file or directory');
        process.exit(2);
      }

      let _emitEvent = noop;

      if (typeof sw.livereload !== 'boolean') {
        if (context.dev) {
          log.info('live reloading feature is enabled by default during development');
        }

        sw.livereload = context.dev;
      }

      if (sw.livereload && context.dev) {
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

      // Resolve name
      let _name = 'sw.js';

      if (
        typeof sw.name === 'string' &&
        sw.name !== ''
      ) {
        _name = `${path.basename(sw.name, '.js')}.js`;
      }

      // Extract DefinePlugin
      const _define = resolvedConfig.plugins!.find((plugin) => {
        return plugin.constructor.name === 'DefinePlugin';
      }) as WebpackPluginInstance;

      // Resolve scope
      const _scope = nextConfig.basePath ? `${nextConfig.basePath}/` : '/';

      // Inject env
      Object.assign(_define.definitions!, {
        'process.env.__NEXT_SW': `'${_scope}${_name}'`,
        'process.env.__NEXT_SW_SCOPE': `'${_scope}'`
      });

      // Use original resolve
      const _resolve = Object.assign({}, resolvedConfig.resolve);

      // Patch resolve
      if (sw.resolve) {
        patchResolve(_resolve, sw.resolve === 'force');
      }

      const _sideEffects = sw.sideEffects ?? true;

      build({
        dev: context.dev,
        name: _name,
        entry: _entry,
        public: _public,
        define: _define,
        resolve: _resolve,
        sideEffects: _sideEffects
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
          log[context.dev ? 'event' : 'info']('compiled service worker successfully');

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
};
