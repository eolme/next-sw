import type { ServerResponse } from 'http';
import type { Duplex } from 'stream';

import { createServer } from 'http';
import { setImmediate } from 'timers';

import { formatAddress, noop, terminateWith } from './utils.js';

/** Simple SSE server implementation */
export const listen = (port: number, ready: (address: string) => void) => {
  let terminated = false;

  const clients = new Set<ServerResponse>();
  const sockets = new Set<Duplex>();

  const destroyClient = (client: ServerResponse) => {
    if (!client.destroyed) {
      client.destroy();
    }
  };

  const destroySocket = (socket: Duplex | null) => {
    if (socket !== null && !socket.destroyed) {
      socket.destroy();
    }
  };

  const recordClient = (client: ServerResponse) => {
    if (terminated) {
      destroyClient(client);
    } else {
      clients.add(client);

      client.once('close', () => {
        destroyClient(client);
        clients.delete(client);
      });
    }
  };

  const recordSocket = (socket: Duplex | null) => {
    if (socket !== null) {
      if (terminated) {
        destroySocket(socket);
      } else {
        sockets.add(socket);

        socket.once('close', () => {
          destroySocket(socket);
          sockets.delete(socket);
        });
      }
    }
  };

  const server = createServer((income, client) => {
    if (terminated) {
      destroyClient(client);
      destroySocket(income.socket);
      destroySocket(client.socket);

      return;
    }

    recordClient(client);
    recordSocket(income.socket);
    recordSocket(client.socket);

    income.socket.setNoDelay(true);
    income.socket.setKeepAlive(true);

    client.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=1',
      'Transfer-Encoding': 'identity',
      'Access-Control-Allow-Origin': '*'
    });
    client.flushHeaders();

    setImmediate(() => {
      if (terminated) {
        return;
      }

      if (client.writable) {
        client.write(':ok\n\n');
      }
    });
  });

  server.timeout = 0;
  server.headersTimeout = 0;
  server.requestTimeout = 0;
  server.keepAliveTimeout = 0;

  server.on('connection', recordSocket);

  const terminate = () => {
    terminated = true;

    clients.forEach(destroyClient);
    clients.clear();

    sockets.forEach(destroySocket);
    sockets.clear();

    server.close(noop);
  };

  server.on('close', terminate);
  server.listen(port, () => ready(formatAddress(server.address())));
  terminateWith(terminate);

  return (event: string, data: string) => {
    setImmediate(() => {
      if (terminated) {
        return;
      }

      clients.forEach((client) => {
        if (client.writable) {
          client.write(`retry: 1000\nevent: ${event}\ndata: ${data}\n\n`);
        }
      });
    });
  };
};
