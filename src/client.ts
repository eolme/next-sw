/// <reference lib="dom" />

export type { };

/* eslint-env browser */

/**
 * @module client
 * @description Runtime client
 */

const unsupported = (reason: string): never => {
  console.error('[next-sw] LiveReloading is unsupported.');
  throw new TypeError(reason);
};

// Check environment
// Checking is ugly, but necessary to avoid mistakes
if (typeof location !== 'object') {
  unsupported('location is not a object');
}

if (typeof location.origin !== 'string') {
  unsupported('location.origin is not a string');
}

if (typeof location.reload !== 'function') {
  unsupported('location.reload is not a function');
}

if (typeof navigator !== 'object') {
  unsupported('navigator is not a object');
}

if (typeof navigator.serviceWorker !== 'object') {
  unsupported('navigator.serviceWorker is not a object');
}

if (typeof navigator.serviceWorker.register !== 'function') {
  unsupported('navigator.serviceWorker.register is not a function');
}

if (typeof EventSource !== 'function') {
  unsupported('EventSource is not a constructor');
}

if (typeof URL !== 'function') {
  unsupported('URL is not a constructor');
}

const URLPortDescriptor = Object.getOwnPropertyDescriptor(URL.prototype, 'port');

if (
  typeof URLPortDescriptor === 'undefined' ||
  (URLPortDescriptor.writable !== true && typeof URLPortDescriptor.set !== 'function')
) {
  unsupported('URL.prototype.port is not writeable');
}

// Original ServiceWorkerContainer
const sw = navigator.serviceWorker;

// Preserve original register
const register = sw.register;

// Preserve own registrations
const registrations: ServiceWorkerRegistration[] = [];

// Unregister all workers
const unregister = function unregister() {
  return Promise.all(registrations.map((registration) => {
    return registration.unregister().catch((ex: unknown) => {
      console.error(`[next-sw] Unregistration failed: ${ex}`);

      return false;
    });
  }));
};

// Save registrations
const proxyRegister = function proxyRegister() {
  return register.apply(sw, arguments as any).then((registration) => {
    registrations.push(registration);

    return registration;
  });
};

// Patch resister
Object.defineProperty(sw, 'register', {
  enumerable: true,
  value: proxyRegister
});

// Live Reloading endpoint
const url = new URL('/', location.origin);

// Live Reloading port
url.port = process.env.__NEXT_SW_PORT || '4000';

// Live Reloading
const source = new EventSource(url);

// Handle control messages
source.onmessage = function onmessage(event) {
  if (event.data === 'error') {
    console.error('[next-sw] Errors while compiling. Reload prevented.');

    return;
  }

  if (event.data === 'reload') {
    console.log('[next-sw] Update detected. Reloading...');

    unregister().then(() => {
      location.reload();
    });

    return;
  }

  console.warn(`[next-sw] Unsupported event detected: ${event.data}`);
};

// Handle error aka disconnect
source.onerror = function onerror() {
  if (source.readyState !== source.CLOSED) {
    try {
      source.close();
    } catch (ex: unknown) {
      console.error(ex);
    }
  }

  console.error('[next-sw] Server has disconnected.');
};
