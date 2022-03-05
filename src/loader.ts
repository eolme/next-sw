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
    jsc: {
      parser: {
        syntax: 'typescript',
        jsx: false
      },
      target: 'es2015',
      loose: true,
      externalHelpers: false
    }
  }).code.toString();
}
