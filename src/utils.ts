import type { AccessError, AnyFunction } from './types';

import { accessSync, constants } from 'fs';
import { default as path } from 'path';

export const INJECT = 'main.js';
export const NAME = 'ServiceWorker';

export const access = (file: string) => {
  try {
    accessSync(file, constants.R_OK);

    return null;
  } catch (ex: unknown) {
    return ex as AccessError;
  }
};

// eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
export const dynamic = (id: string) => require(require.resolve(id, {
  paths: [
    process.cwd(),
    path.resolve(__dirname, '..')
  ]
}));

export const splice = (arr: unknown[], item: unknown) => {
  const index = arr.indexOf(item);

  if (index !== -1) {
    arr.splice(index, 1);
  }
};

export const noop: AnyFunction = () => {
  // Noop
};

export const tapPromiseDelegate = () => {
  let resolve = noop;
  let reject = noop;

  const promise = new Promise<void>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  return {
    promise,
    resolve,
    reject
  } as const;
};

export const clearErrorStackTrace = (error: string) => {
  return error.replace(/\n{3,}/g, '\n\n')
    .replace(/^.*Module build failed.*$/m, '').replace(/^\s*at\s[\S\s]+/gm, '')
    .trim();
};

export const once = (handler: () => void) => {
  let called = false;

  return () => {
    if (called) {
      return;
    }

    handler();
    called = true;
  };
};

export const terminateWith = (handler: () => void) => {
  const cb = once(handler);

  [
    // Parent close
    'SIGHUP',
    'SIGPIPE',
    'SIGUSR2',

    // Self close
    'SIGINT',
    'SIGQUIT',
    'SIGTERM'
  ].forEach((signal) => {
    process.prependListener(signal as NodeJS.Signals, cb);
  });
};
