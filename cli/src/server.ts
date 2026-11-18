/**
 * server.ts
 *
 * Express app behind `metacall launchpad`. Serves the built dashboard and the
 * runtime config the UI reads at startup (see src/app/config/runtime.ts), and
 * forwards the dashboard's API requests to FaaS.
 */

import express, { Express, RequestHandler } from 'express';
import { join } from 'path';
import { forward } from './proxy';

export const RUNTIME_CONFIG_PATH = '/__launchpad/config';

export interface ServerOptions {
  port: number;
  publicDir?: string;
  faasUrl?: URL;
}

/** Create the app. `publicDir` defaults to the dashboard bundled in the package. */
export function createApp({
  port,
  publicDir = join(__dirname, 'public'),
  faasUrl = new URL('http://localhost:9000'),
}: ServerOptions): Express {
  const app = express();
  app.disable('x-powered-by');

  // Our own origin, not FaaS: FaaS sends no CORS headers, and protocol only
  // builds local call URLs when the hostname is `localhost`.
  app.get(RUNTIME_CONFIG_PATH, (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ faasUrl: `http://localhost:${port}`, token: 'local', mode: 'local' });
  });

  // FaaS routes at their real paths, before the dashboard, so the UI talks to
  // FaaS through this origin. No dashboard route has the function call shape.
  // FaaS's /static/ route isn't forwarded: the dashboard doesn't use it, and it
  // would serve deployed files (HTML too) from the dashboard's origin.
  const toFaas: RequestHandler[] = [fromDashboard, (req, res) => forward(req, res, faasUrl)];
  app.use('/api', toFaas);
  app.all('/validate', toFaas);
  app.all('/:prefix/:suffix/:version/call/*', toFaas);

  app.use(express.static(publicDir));

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

/**
 * Only forward what the dashboard itself sends. A web page can't reach FaaS
 * through Launchpad with DNS rebinding (its own name in `Host`) or a
 * cross-site POST or fetch (its own `Origin`). Browsers leave `Origin` off
 * simple cross-site GETs, so those still pass, as they reach FaaS on :9000.
 */
const fromDashboard: RequestHandler = (req, res, next) => {
  // The port the browser connected to, so it also holds for listen(0) in tests
  const own = ['localhost', '127.0.0.1'].map(
    host => new URL(`http://${host}:${req.socket.localPort}`).origin,
  );
  const { host, origin } = req.headers;
  if (own.includes(`http://${host}`) && (origin === undefined || own.includes(origin))) {
    next();
    return;
  }
  res.status(403).json({ error: 'Launchpad only forwards requests from its own dashboard' });
};
