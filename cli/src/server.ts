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
  const toFaas: RequestHandler = (req, res) => forward(req, res, faasUrl);
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
