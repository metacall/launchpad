/**
 * proxy.ts
 *
 * Forwards a request to FaaS unchanged and streams the answer back. Nothing
 * parses the body first, so ZIP uploads reach FaaS (busboy) byte for byte.
 */

import { Request, Response } from 'express';
import { IncomingHttpHeaders, OutgoingHttpHeaders, request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';

// Headers that only apply to one connection (RFC 9110 section 7.6.1)
const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

function endToEndHeaders(headers: IncomingHttpHeaders): OutgoingHttpHeaders {
  const listed = (headers.connection ?? '').split(',').map(name => name.trim().toLowerCase());
  const result: OutgoingHttpHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (!HOP_BY_HOP.includes(name) && !listed.includes(name)) result[name] = value;
  }
  return result;
}

export function forward(req: Request, res: Response, target: URL): void {
  const request = target.protocol === 'https:' ? httpsRequest : httpRequest;

  const upstream = request(
    {
      // Plain fields, not urlToHttpOptions(): on Node 18 its result still looks
      // like a URL to http.request, which then ignores `path` and sends `/`
      protocol: target.protocol,
      hostname: target.hostname.replace(/^\[(.*)\]$/, '$1'),
      port: target.port,
      method: req.method,
      path: req.originalUrl,
      headers: { ...endToEndHeaders(req.headers), host: target.host },
    },
    faasRes => {
      res.writeHead(faasRes.statusCode ?? 502, endToEndHeaders(faasRes.headers));
      faasRes.pipe(res);
      faasRes.on('error', () => res.destroy());
    },
  );

  upstream.on('error', () => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.status(502).json({ error: `No response from FaaS at ${target.origin}` });
  });

  // The browser went away before FaaS answered
  res.on('close', () => {
    if (!res.writableFinished) upstream.destroy();
  });

  req.pipe(upstream);
}
