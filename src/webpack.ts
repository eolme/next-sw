import type { WebpackFunction } from './types';

import { log } from './log';
import { dynamic } from './utils';

const semver = (fn: any) => {
  const version = fn.version;

  if (typeof version === 'string') {
    return version.split('.').map(Number);
  }

  return [0, 0, 0];
};

const valid = (version: number[]) => version[0] === 5 && version[1] >= 64;

export const webpack = (fn?: WebpackFunction): WebpackFunction => {
  let version = [0, 0, 0];

  // Check provided
  if (
    typeof fn === 'function' &&
    'version' in fn
  ) {
    version = semver(fn);

    if (valid(version)) {
      return fn;
    }
  }

  // Check compiled
  try {
    fn = dynamic('next/dist/compiled/webpack/bundle5')().webpack;

    if (
      typeof fn === 'function' &&
      'version' in fn
    ) {
      version = semver(fn);

      if (valid(version)) {
        return fn;
      }
    }
  } catch {
    // Ignore
  }

  // Check external
  try {
    fn = dynamic('webpack');

    if (
      typeof fn === 'function' &&
      'version' in fn
    ) {
      version = semver(fn);

      if (valid(version)) {
        return fn;
      }
    }
  } catch {
    // Ignore
  }

  log.error(`next-sw depends on at least webpack@5.64 but only webpack@${version[0]}.${version[1]} was found`);
  process.exit(2);
};
