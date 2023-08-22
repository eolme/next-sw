import type { Webpack } from './types.js';

import { dynamic } from './dynamic.js';
import { log } from './log.js';

const semver = (version: string) => {
  if (typeof version === 'string') {
    return version.split('.').slice(0, 3).map(Number);
  }

  return [0, 0, 0];
};

const valid = (fn?: Webpack): fn is Webpack =>
  typeof fn === 'function' &&
  typeof fn.version === 'string' &&
  typeof fn.DefinePlugin === 'function';

export const ensureWebpack = (webpack?: Webpack): Webpack => {
  let version = [0, 0, 0];

  const available = [
    () => webpack,
    () => dynamic('next/dist/compiled/webpack/bundle5')().webpack,
    () => dynamic('webpack')
  ];

  for (const check of available) {
    try {
      const provided = check();

      if (valid(provided)) {
        version = semver(provided.version);

        if (version[0] === 5 && version[1] >= 64) {
          return provided;
        }
      }
    } catch {
      // Ignore
    }
  }

  log.error(`next-sw depends on at least webpack@5.64.0 but only webpack@${version[0] || 0}.${version[1] || 0}.${version[2] || 0} was found`);
  process.exit(2);
};
