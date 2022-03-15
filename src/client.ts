/// <reference lib="dom" />

export type { };

/* eslint-env browser */

/**
 * @module client
 * @description Runtime client
 */

// Preserve original register
const register = navigator.serviceWorker.register;

// Unregister all workers
const unregister = () => {
  return navigator.serviceWorker.getRegistrations().then((registrations) => {
    return Promise.all(registrations.map((registration) => registration.unregister()));
  });
};

// Update current registration
const update = function update() {
  return unregister().then(() => register.apply(navigator.serviceWorker, arguments as any));
};

// Patch resister
Object.defineProperty(navigator.serviceWorker, 'register', {
  enumerable: true,
  value: update
});

// Live Reloading endpoint
const url = new URL('/', location.origin);

// Live Reloading port
url.port = '4000';

const source = new EventSource(url);

// Handle control messages
source.onmessage = (event) => {
  if (event.data === 'error') {
    console.error('[ServiceWorker] Errors while compiling. Reload prevented.');

    return;
  }

  if (event.data === 'reload') {
    console.log('[ServiceWorker] Update detected. Reloading...');

    unregister().then(() => {
      location.reload();
    });

    return;
  }

  console.warn(`[ServiceWorker] Unsupported event detected: ${event.data}`);
};

// Handle error aka disconnect
source.onerror = () => {
  console.error('[ServiceWorker] Server has disconnected.');
};
