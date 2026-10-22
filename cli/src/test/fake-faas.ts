import { createServer, IncomingHttpHeaders, Server, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

export interface ReceivedRequest {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

export interface FakeFaas {
  url: string;
  requests: ReceivedRequest[];
  close: () => Promise<void>;
}

type Respond = (req: ReceivedRequest, res: ServerResponse) => void;

const echo: Respond = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ method: req.method, url: req.url }));
};

/** A stand-in for FaaS that records every request it gets. */
export async function startFakeFaas(respond: Respond = echo): Promise<FakeFaas> {
  const requests: ReceivedRequest[] = [];

  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const received = {
        method: req.method ?? '',
        url: req.url ?? '',
        headers: req.headers,
        body: Buffer.concat(chunks),
      };
      requests.push(received);
      respond(received, res);
    });
  });

  server.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));

  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    close: () => stop(server),
  };
}

/** Close a test server, even if a request is still hanging on it. */
export function stop(server: Server): Promise<void> {
  server.closeAllConnections();
  return new Promise<void>(resolve => server.close(() => resolve()));
}

/** A URL where nothing is listening, like FaaS when it isn't started. */
export async function closedUrl(): Promise<string> {
  const server = createServer().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  await stop(server);
  return `http://127.0.0.1:${port}`;
}
