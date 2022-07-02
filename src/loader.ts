import type { LoaderContext } from 'webpack';

import { dynamic } from './utils';

const swc = dynamic('next/dist/build/swc');

/** Simple SWC loader */
export default function ServiceWorkerLoader(
  this: LoaderContext<{ minify: boolean }>,
  source: string
): string {
  const options = this.getOptions();

  return swc.transformSync(source, {
    sourceMaps: false,
    isModule: true,
    minify: options.minify,
    module: {
      type: 'es6',
      lazy: true
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
            vars: {
              'globalThis': 'self',
              'process.env.NODE_ENV': options.minify ? '"production"' : '"development"'
            },
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
