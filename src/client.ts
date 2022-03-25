/// <reference lib="dom" />

export type { };

/* eslint-env browser */

/**
 * @module client
 * @description Runtime client
 */

/** */
const sw = navigator.serviceWorker;

// Preserve original register
const register = sw.register;

// Preserve registrations
const registrations: ServiceWorkerRegistration[] = [];

// Unregister all workers
const unregister = function unregister() {
  return Promise.all(registrations.map((registration) => {
    return registration.unregister().catch((ex: unknown) => {
      console.error(`[ServiceWorker] Unregistration failed: ${ex}`);

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
url.port = '4000';

/** */
const source = new EventSource(url);

// Handle control messages
source.onmessage = function onmessage(event) {
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
source.onerror = function onerror() {
  console.error('[ServiceWorker] Server has disconnected.');
};
