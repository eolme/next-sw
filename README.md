# next-sw [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/eolme/next-sw/blob/master/LICENSE)

Use **any** service worker with nextjs.

## Features

- Easy to use
- No dependencies
- No custom server needed
- Supports `next export`

After running `next` or `next build`, this will generate single file `sw.js` in your public folder, which serve statically.

Live reloading and unregistering service worker are supported out of the box during development.

## Configuration

There are options you can use to customize the behavior of this plugin in `next.config.js`:

```js
const { withServiceWorker } = require('next-sw');

module.exports = withServiceWorker({
  name: 'sw.js',
  entry: 'worker/entry.ts',
  livereload: true
})();
```

### Available Options

- `name: string` - service worker name
  - default to `sw.js`
- `entry: string` - service worker script entry point
- `livereload: boolean`
  - default to `true` during development
  - set `livereload: false` to disable live reloading
  - note: if the option is disabled, you need to use your own implementation of page reload
- `port: number`
  - default to `4000`
- `sideEffects: boolean | string | RegExp | string[] | RegExp[] | ((file: string) => boolean)`
  - default to `true`
- `resolve: boolean | 'force'` - patch resolve for worker support
  - default to `false`
  - set `'force'` to force patch

## Usage

You need to manually register service worker, for example, in `pages/_app.jsx` like this:

```js
if (typeof window !== 'undefined') {
  navigator.serviceWorker.register(process.env.__NEXT_SW, {
    scope: process.env.__NEXT_SW_SCOPE
  });
}
```

or if you use `appDir`, you need to create a client component with registration:

```js
'use client';

import { useEffect } from 'react';

export const ClientServiceWorkerRegistration = () => {
  useEffect(() => {
    navigator.serviceWorker.register(process.env.__NEXT_SW, {
      scope: process.env.__NEXT_SW_SCOPE
    });
  }, []);
};
```

or create a universal one with check:

```js
import { useEffect } from 'react';

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      navigator.serviceWorker.register(process.env.__NEXT_SW, {
        scope: process.env.__NEXT_SW_SCOPE
      });
    }
  }, []);
};
```

## Installation

Recommend to use [yarn](https://yarnpkg.com/getting-started/install) for dependency management:

```shell
yarn add -D next-sw
```

## License

next-sw is [MIT licensed](./LICENSE).
