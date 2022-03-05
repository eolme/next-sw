import { constants, default as fs } from 'fs';

export const INJECT = 'main.js';
export const NAME = 'ServiceWorker';

export const access = (path: string) => {
  try {
    fs.accessSync(path, constants.R_OK);

    return null;
  } catch (ex: unknown) {
    return ex as Error;
  }
};

// eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
export const dynamic = (id: string) => require(require.resolve(id, {
  paths: [
    process.cwd()
  ]
}));

export const splice = (arr: unknown[], item: unknown) => {
  const index = arr.indexOf(item);

  if (index !== -1) {
    arr.splice(index, 1);
  }
};

type AnyFunction = (...args: any[]) => any;

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
