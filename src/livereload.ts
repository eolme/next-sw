import type { ServerResponse } from 'http';

import { createServer } from 'http';
import { setImmediate } from 'timers';

import { splice } from './utils';

/** Simple SSE server implementation */
export const listen = (ready: () => void) => {
  const clients: ServerResponse[] = [];

  const server = createServer((req, res) => {
    clients.push(res);
    res.once('close', () => {
      splice(clients, res);
    });

    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-transform',
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=0',
      'Transfer-Encoding': 'identity',
      'Access-Control-Allow-Origin': '*'
    });
    res.flushHeaders();

    setImmediate(() => {
      res.write(':ok\n\n');
    });
  });

  server.timeout = 0;
  server.headersTimeout = 0;
  server.requestTimeout = 0;
  server.keepAliveTimeout = 0;

  server.listen(4000, ready);

  return (event: string) => {
    setImmediate(() => {
      clients.forEach((client) => {
        client.write(`data: ${event}\n\n`);
      });
    });
  };
};
