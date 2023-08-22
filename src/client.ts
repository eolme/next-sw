/// <reference lib="dom" />

export type { };

/* eslint-env browser */

/**
 * @module client
 * @description Runtime client
 */
(() => {
  const unsupported = (reason: string): Error => {
    console.error('[next:sw] Live reloading is unsupported');

    return new TypeError(reason);
  };

  const URLPortDescriptor = Object.getOwnPropertyDescriptor(URL.prototype, 'port');

  if (
    typeof URLPortDescriptor === 'undefined' ||
    (URLPortDescriptor.writable !== true && typeof URLPortDescriptor.set !== 'function')
  ) {
    throw unsupported('URL.prototype.port is not writeable');
  }

  // Original ServiceWorkerContainer
  const sw =
    typeof navigator !== 'undefined' &&
      typeof navigator.serviceWorker !== 'undefined' &&
      typeof navigator.serviceWorker.register === 'function' ?
      navigator.serviceWorker :
      {
        register: () => Promise.reject(unsupported('ServiceWorkerContainer is invalid'))
      } as unknown as ServiceWorkerContainer;

  if ('next:sw' in sw) {
    return;
  }

  Object.defineProperty(sw, 'next:sw', {
    value: true
  });

  // Preserve original register
  const register = sw.register;

  // Preserve own registrations
  const registrations: ServiceWorkerRegistration[] = [];

  // Unregister all workers
  const unregister = function unregister() {
    return Promise.all(registrations.map((registration) => {
      return registration.unregister().catch((ex: unknown) => {
        console.error('[next:sw] Unregistration failed:', ex);

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

  source.addEventListener('next:sw:wait', () => {
    console.warn('[next:sw] Compilation errors detected, reload prevented...');
  });

  source.addEventListener('next:sw:reload', () => {
    console.log('[next:sw] Update detected, reloading...');

    unregister().then(
      () => location.reload(),
      () => location.reload()
    );
  });

  source.addEventListener('error', () => {
    if (source.readyState !== source.CLOSED) {
      try {
        source.close();
      } catch (ex: unknown) {
        console.error(ex);
      }
    }

    console.error('[next:sw] Server has disconnected');
  });
})();
