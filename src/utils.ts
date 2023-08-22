import type { AddressInfo } from 'net';
import type { AccessError, AnyFunction } from './types.js';

import { accessSync, constants } from 'fs';
import { log } from './log.js';

const INJECT_ENTRY_POINTS = [
  'main-app',
  'pages/_app'
];

export const inject = (client: string, entry: Record<string, string | string[]>) => {
  let injected = false;

  INJECT_ENTRY_POINTS.forEach((point) => {
    if (point in entry) {
      const files = entry[point];

      if (typeof files === 'string') {
        injected = true;

        if (files === client) {
          return;
        }

        log.info(`live reload client is injected to "${point}"`);

        entry[point] = [
          client,
          files
        ];

        return;
      }

      if (Array.isArray(files)) {
        injected = true;

        if (files.includes(client)) {
          return;
        }

        log.info(`live reload client is injected to "${point}"`);

        files.unshift(client);
      }
    }
  });

  if (!injected) {
    log.error('live reload client is not injected\n  open new issue with config info\n  https://github.com/eolme/next-sw/issues/new');
  }

  return entry;
};

export const NAME = ':next:sw:';

export const access = (file: string) => {
  try {
    accessSync(file, constants.R_OK);

    return null;
  } catch (ex: unknown) {
    return ex as AccessError;
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
  /* eslint-disable unicorn/prefer-string-replace-all */
  return error.replace(/\n{3,}/g, '\n\n')
    .replace(/^.*Module build failed.*$/m, '')
    .replace(/^\s*at\s[\S\s]+/gm, '')
    .trim();
};

export const once = <T extends AnyFunction>(handler: T): T => {
  let called = false;
  let value: ReturnType<T> | null = null;

  return function(this: any) {
    if (called) {
      return value;
    }

    value = Reflect.apply(handler, this, arguments);
    called = true;

    return value;
  } as T;
};

export const terminateWith = (handler: () => void) => {
  const cb = once(handler);

  [
    'SIGHUP',
    'SIGINT',
    'SIGQUIT',
    'SIGTERM'
  ].forEach((signal) => {
    process.prependListener(signal as NodeJS.Signals, cb);
  });

  process.prependListener('beforeExit', cb);
  process.prependListener('exit', cb);
};

export const formatAddress = (address: AddressInfo | string | null) => {
  if (address == null) {
    return '<unknown>';
  }

  if (typeof address === 'string') {
    return address;
  }

  if (address.family === 'IPv6') {
    return `[${address.address}]:${address.port}`;
  }

  return `${address.address}:${address.port}`;
};
