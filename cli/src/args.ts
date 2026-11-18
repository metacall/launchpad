/**
 * args.ts
 *
 * The command line options of `metacall launchpad`.
 */

import { isIPv4 } from 'net';
import { parseArgs } from 'util';

export const DEFAULT_PORT = 9001;
export const DEFAULT_FAAS_URL = 'http://localhost:9000';

export const HELP = `Usage: metacall launchpad [options]

Serves the MetaCall Launchpad dashboard for a local MetaCall FaaS.

Options:
  --port <port>     Port to serve the dashboard on (default: ${DEFAULT_PORT})
  --faas-url <url>  Address of the local FaaS (default: ${DEFAULT_FAAS_URL})
  --no-open         Don't open the dashboard in the browser
  --version         Print the version and exit
  --help            Print this help and exit`;

export interface Options {
  port: number;
  faasUrl: URL;
  open: boolean;
  help: boolean;
  version: boolean;
}

/** A mistake in the command line. Its message is meant for the user. */
export class UsageError extends Error {}

export function parseOptions(args: string[]): Options {
  let values;
  try {
    ({ values } = parseArgs({
      args,
      options: {
        port: { type: 'string' },
        'faas-url': { type: 'string' },
        'no-open': { type: 'boolean' },
        help: { type: 'boolean' },
        version: { type: 'boolean' },
      },
    }));
  } catch (err) {
    // parseArgs already explains what's wrong (unknown option, missing value...)
    throw new UsageError((err as Error).message);
  }

  const port = parsePort(values.port ?? String(DEFAULT_PORT));
  const faasUrl = parseFaasUrl(values['faas-url'] ?? DEFAULT_FAAS_URL);
  if (isLaunchpadItself(faasUrl, port)) {
    throw new UsageError(
      `--faas-url points at Launchpad itself (${faasUrl.origin}). Use another --port or --faas-url`,
    );
  }

  return {
    port,
    faasUrl,
    open: !values['no-open'],
    help: values.help ?? false,
    version: values.version ?? false,
  };
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new UsageError(`--port must be a number from 1 to 65535, got "${value}"`);
  }
  return port;
}

// Every forwarded request would come back to Launchpad and be forwarded again
function isLaunchpadItself(faasUrl: URL, port: number): boolean {
  const loopback =
    ['localhost', '[::1]'].includes(faasUrl.hostname) ||
    (isIPv4(faasUrl.hostname) && faasUrl.hostname.startsWith('127.'));
  const faasPort = Number(faasUrl.port || (faasUrl.protocol === 'https:' ? 443 : 80));
  return loopback && faasPort === port;
}

// Only an origin: forwarded requests keep their own path, so a path here would be ignored
function parseFaasUrl(value: string): URL {
  let url: URL | undefined;
  try {
    url = new URL(value);
  } catch {
    // reported below
  }
  if (
    !url ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new UsageError(
      `--faas-url must be an http or https address like ${DEFAULT_FAAS_URL}, got "${value}"`,
    );
  }
  return url;
}
