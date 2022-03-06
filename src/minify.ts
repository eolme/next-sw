import type { Compiler } from 'webpack';

import { NAME, dynamic } from './utils';

const swc = dynamic('next/dist/build/swc');

/** Simple SWC minifier */
export default function ServiceWorkerMinify(
  this: Compiler,
  compiler: Compiler
) {
  compiler.hooks.compilation.tap(NAME, (compilation) => {
    const hooks = compiler.webpack.javascript.JavascriptModulesPlugin.getCompilationHooks(compilation);

    hooks.chunkHash.tap(NAME, (_, hash) => {
      hash.update(NAME);
    });

    compilation.hooks.processAssets.tap({
      name: NAME,
      stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
      additionalAssets: true
    }, (assets) => {
      Object.keys(assets).forEach((assetName) => {
        const asset = compilation.getAsset(assetName)!;

        if (asset.info.minimized) {
          return;
        }

        const result = swc.minifySync(asset.source.source().toString(), {
          compress: true,
          mangle: true
        });

        const source = new compiler.webpack.sources.RawSource(result.code, true);

        compilation.updateAsset(assetName, source, {
          minimized: true
        });
      });
    });
  });
}
