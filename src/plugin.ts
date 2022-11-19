import type {
  NextConfigLoose,
  ServiceWorkerConfig,
  WebpackConfiguration,
  WebpackPluginInstance,
  WebpackRecompilation
} from './types';

import { default as path } from 'path';

import { INJECT, NAME, access, clearErrorStackTrace, noop, tapPromiseDelegate } from './utils';
import { patchResolve } from './patch';
import { listen } from './livereload';
import { build } from './build';
import { log } from './log';
import { webpack } from './webpack';

/**
 * Next ServiceWorker plugin
 *
 * @author Anton Petrov <eolme>
 * @see https://github.com/eolme/next-sw
 *
 * @param {ServiceWorkerConfig} nextConfig
 * @returns {(config: NextConfigLoose) => NextConfigLoose}
 */
export default (sw: ServiceWorkerConfig = {}) => (nextConfig: NextConfigLoose = {}): NextConfigLoose => {
  // Clone config
  nextConfig = Object.assign({}, nextConfig);

  // Fallback webpack config
  const nextConfigWebpack = nextConfig.webpack || ((config) => config);

  const nextConfigPlugin: NextConfigLoose = {
    webpack(config, context) {
      const resolvedConfig: WebpackConfiguration = nextConfigWebpack(config, context);

      if (context.isServer) {
        return resolvedConfig;
      }

      // Clone config
      sw = Object.assign({}, sw);

      if (typeof sw.entry !== 'string') {
        log.info('skipping building service worker');

        return resolvedConfig;
      }

      // Resolve webpack
      const pack = webpack(context.webpack);

      // Resolve entry
      if (!path.isAbsolute(sw.entry)) {
        sw.entry = path.resolve(process.cwd(), sw.entry);
      } else {
        sw.entry = path.normalize(sw.entry);
      }

      // Check if entry is accessible
      if (access(sw.entry) !== null) {
        log.error(`./${path.relative(process.cwd(), sw.entry)}`);
        console.error('ENOENT: no such file or directory');
        process.exit(2);
      }

      let emit = noop;

      if (typeof sw.livereload !== 'boolean') {
        if (context.dev) {
          log.info('live reloading feature is enabled by default during development');
        }

        sw.livereload = context.dev;
      }

      if (sw.livereload && context.dev) {
        if (typeof sw.port !== 'number' || Number.isNaN(sw.port)) {
          sw.port = 4000;
        }

        // Start SSE server
        emit = listen(sw.port, () => {
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

      // It is necessary to delegate state of own compilation
      const sync = tapPromiseDelegate();

      // Resolve public folder
      const dest = path.resolve(process.cwd(), 'public');

      // Resolve name
      if (typeof sw.name === 'string' && sw.name.length > 0) {
        // Fix extension
        sw.name = `${path.basename(sw.name, '.js')}.js`;
      } else {
        sw.name = 'sw.js';
      }

      // Extract DefinePlugin
      const define = resolvedConfig.plugins!.find((plugin) => {
        return plugin.constructor.name === 'DefinePlugin';
      }) as WebpackPluginInstance;

      // Resolve scope
      const scope = nextConfig.basePath ? `${nextConfig.basePath}/` : '/';

      // Inject env
      Object.assign(define.definitions!, {
        'process.env.__NEXT_SW': `'${scope}${sw.name}'`,
        'process.env.__NEXT_SW_SCOPE': `'${scope}'`,
        'process.env.__NEXT_SW_PORT': `'${sw.port}'`
      });

      // Use original resolve
      const resolve = Object.assign({}, resolvedConfig.resolve);

      // Patch resolve
      if (sw.resolve) {
        patchResolve(resolve, sw.resolve === 'force');
      }

      const recompilation: WebpackRecompilation = {
        status: false,
        hash: null,
        error: ''
      };

      build(pack, {
        dev: context.dev,
        name: sw.name,
        entry: sw.entry,
        dest,
        define,
        resolve,
        sideEffects: sw.sideEffects ?? true
      }, (stats) => {
        if (stats.hasErrors()) {
          const stat = stats.toJson({
            all: false,
            errors: true
          });

          if (
            typeof stat.errors === 'object' && stat.errors !== null &&
            stat.errors.length > 0
          ) {
            const error = clearErrorStackTrace(stat.errors[0].message);

            // Prevent spam with same error
            if (recompilation.error !== error) {
              recompilation.error = error;

              log.error(stat.moduleName!);
              console.error(recompilation.error);

              if (context.dev) {
                emit('error');
              } else {
                process.exit(1);
              }
            }
          }
        }

        // Prevent reload with same output
        if (recompilation.hash !== stats.compilation.fullHash) {
          log[context.dev ? 'event' : 'info']('compiled service worker successfully');

          if (context.dev && recompilation.status) {
            log.wait('reloading...');

            emit('reload');
          } else {
            sync.resolve();
          }

          recompilation.status = true;
          recompilation.hash = stats.compilation.fullHash;
        }

        // Nothing to show
      });

      // Plugin to wait for compilation
      resolvedConfig.plugins!.push({
        name: NAME,
        apply(compiler) {
          compiler.hooks.done.tapPromise(NAME, () => sync.promise);
        }
      });

      return resolvedConfig;
    }
  };

  return Object.assign({}, nextConfig, nextConfigPlugin);
};
