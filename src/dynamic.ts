import { resolve } from 'path';

// eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
export const dynamic = (id: string) => require(require.resolve(id, {
  paths: [
    process.cwd(),
    resolve(__dirname, '..')
  ]
}));
