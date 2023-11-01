import type { WebpackLoaderContext } from './types.js';

import { dynamic } from './dynamic.js';

const swc = dynamic('next/dist/build/swc');

/** Simple SWC loader */
export default function ServiceWorkerLoader(
  this: WebpackLoaderContext<{
    minify: boolean;
    defines: Record<string, string>;
  }>,
  source: string
): string {
  const options = this.getOptions();

  return swc.transformSync(source, {
    sourceMaps: false,
    isModule: true,
    minify: options.minify,
    module: {
      type: 'es6'
    },
    jsc: {
      parser: {
        syntax: 'typescript'
      },
      target: 'es2015',
      loose: true,
      externalHelpers: false,
      transform: {
        optimizer: {
          globals: {
            vars: options.defines,
            typeofs: {
              window: 'undefined',
              document: 'undefined'
            }
          }
        }
      }
    }
  }).code.toString();
}
