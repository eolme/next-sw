import type {
  NextConfigLoose,
  ServiceWorkerConfig,
  WebpackConfiguration,
  WebpackRecompilation
} from './types.js';

import { default as path } from 'path';

import { NAME, access, clearErrorStackTrace, inject, noop, tapPromiseDelegate } from './utils.js';
import { patchResolve } from './patch.js';
import { listen } from './livereload.js';
import { build } from './build.js';
import { log } from './log.js';
import { ensureWebpack } from './webpack.js';
import { RELOAD, WAIT } from './events.js';

/**
 * Next ServiceWorker plugin
 *
 * @author Anton Petrov <eolme>
 * @see https://github.com/eolme/next-sw
 */
export default (sw: ServiceWorkerConfig = {}) => <T>(userNextConfig: T): T => {
  // Clone config
  const nextConfig = Object.assign({}, userNextConfig) as NextConfigLoose;

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
      const webpack = ensureWebpack(context.webpack);

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

      if (
        typeof sw.port !== 'number' ||
        !Number.isInteger(sw.port)
      ) {
        sw.port = 4000;
      }

      let emit = noop;

      if (typeof sw.livereload !== 'boolean') {
        if (context.dev) {
          log.info('live reloading feature is enabled by default during development');
        }

        sw.livereload = context.dev;
      }

      if (sw.livereload && context.dev) {
        // Start SSE server
        emit = listen(sw.port, (address) => {
          log.ready(`started live reloading server on ${address}`);
        });

        const client = path.resolve(__dirname, 'client.js');

        // Inject client
        const resolvedEntry = resolvedConfig.entry as (() => Promise<Record<string, string[]>>);

        resolvedConfig.entry = () => resolvedEntry().then((entry) => inject(client, entry));
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

      // Resolve scope
      const scope = nextConfig.basePath ? `${nextConfig.basePath}/` : '/';

      const originalDefinePlugin = (resolvedConfig.plugins || []).find((plugin) => plugin.constructor.name === 'DefinePlugin');
      const originalDefinesRaw = ((originalDefinePlugin || {}) as { definitions?: Record<string, string> }).definitions || {};
      const originalDefines = JSON.parse(JSON.stringify(originalDefinesRaw));

      process.env.__NEXT_SW = `"${scope}${sw.name}"`;
      process.env.__NEXT_SW_SCOPE = `"${scope}"`;
      process.env.__NEXT_SW_PORT = `"${sw.port}"`;

      const pluginDefines = {
        'process.env.__NEXT_SW': `"${scope}${sw.name}"`,
        'process.env.__NEXT_SW_SCOPE': `"${scope}"`,
        'process.env.__NEXT_SW_PORT': `"${sw.port}"`
      };

      const defines = Object.assign({}, originalDefines, pluginDefines);

      // Apply defines
      resolvedConfig.plugins!.push(new webpack.DefinePlugin(pluginDefines));

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

      build(webpack, {
        dev: context.dev,
        name: sw.name,
        entry: sw.entry,
        dest,
        define: new webpack.DefinePlugin(defines),
        defines,
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
                emit(WAIT, recompilation.hash);

                return;
              }

              process.exit(1);
            }
          }
        }

        // Prevent reload with same output
        if (recompilation.hash !== stats.compilation.fullHash) {
          const time = (stats.compilation.endTime || 0) - (stats.compilation.startTime || 0);
          const formattedTime = time > 2000 ?
            `${Math.round(time / 100) / 10}s` :
            `${time} ms`;

          const formattedModules = `(${stats.compilation.modules.size} modules)`;

          log[context.dev ? 'event' : 'info'](`compiled service worker successfully in ${formattedTime} ${formattedModules}`);

          if (context.dev && recompilation.status) {
            log.wait('reloading...');

            emit(RELOAD, recompilation.hash);
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

  return Object.assign({}, nextConfig, nextConfigPlugin) as T;
};
