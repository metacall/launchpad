/**
 * server.ts
 *
 * Express app behind `metacall launchpad`. Serves the built dashboard and the
 * runtime config the UI reads at startup (see src/app/config/runtime.ts).
 */

import express, { Express, Request, Response } from 'express';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { join } from 'path';

export const RUNTIME_CONFIG_PATH = '/__launchpad/config';

export interface ServerOptions {
  port: number;
  faasUrl?: string;
  publicDir?: string;
}

/** Create the app. `publicDir` defaults to the dashboard bundled in the package. */
export function createApp({
  faasUrl = 'http://localhost:9000',
  publicDir = join(__dirname, 'public'),
}: ServerOptions): Express {
  const app = express();
  app.disable('x-powered-by');

  app.get(RUNTIME_CONFIG_PATH, (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ faasUrl, token: 'local', mode: 'local' });
  });

  app.use(express.static(publicDir));

  app.use((req, res, next) => {
    if (req.method === 'GET' && (req.headers.accept ?? '').includes('text/html')) {
      return next();
    }
    if (req.path.startsWith('/assets/') || /\.[^/]+$/.test(req.path)) {
      return next();
    }
    return proxyToFaas(faasUrl, req, res);
  });

  // SPA fallback for page loads only, so a missing asset stays a 404
  app.get('*', (req, res, next) => {
    if (!(req.headers.accept ?? '').includes('text/html')) return next();
    res.sendFile('index.html', { root: publicDir }, err => {
      if (err && !res.headersSent) {
        res
          .status(500)
          .type('text')
          .send('Dashboard bundle not found. Run `npm run build` in cli/.');
      }
    });
  });

  return app;
}

function proxyToFaas(target: string, req: Request, res: Response): void {
  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    res.status(500).type('text').send('Invalid FaaS URL.');
    return;
  }

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  headers.host = targetUrl.host;
  headers['x-forwarded-host'] = req.headers.host ?? '';

  const requestImpl = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstream = requestImpl(
    {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: `${targetUrl.pathname.replace(/\/$/, '')}${req.originalUrl}`,
      method: req.method,
      headers,
    },
    upstreamResponse => {
      res.status(upstreamResponse.statusCode ?? 502);
      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (value !== undefined) res.setHeader(name, value);
      }
      upstreamResponse.pipe(res);
    },
  );

  upstream.on('error', (error: NodeJS.ErrnoException) => {
    if (res.headersSent) return;
    res.status(error.code === 'ECONNREFUSED' ? 503 : 502).type('text').send(
      `Unable to reach MetaCall FaaS at ${target}.`,
    );
  });
  req.pipe(upstream);
}
