# next-sw [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/eolme/next-sw/blob/master/LICENSE)

Use any ServiceWorker with nextjs.

## Configuration

There are options you can use to customize the behavior of this plugin by adding `serviceWorker` object in the next config in `next.config.js`:

```javascript
const { withServiceWorker } = require('next-sw');

module.exports = withServiceWorker({
  serviceWorker: {
    entry: 'worker/entry.ts',
    livereload: true
  }
});
```

### Available Options

- entry: string - ServiceWorker script entry point
- livereload: boolean
  - default to `true` during development
  - set `livereload: false` to disable Live Reloading
  - note: if the option is disabled, you need to use your own implementation of page reload

## Installation

We recommend to use [yarn](https://classic.yarnpkg.com/en/docs/install/) for dependency management:

```shell
yarn add next-sw
```

## License

next-sw is [MIT licensed](./LICENSE).
