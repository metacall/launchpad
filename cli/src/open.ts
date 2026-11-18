/**
 * open.ts
 *
 * Opens the dashboard in the default browser when Launchpad starts.
 */

import { spawn as nodeSpawn, SpawnOptions } from 'child_process';

// The part of child_process.spawn used here, so tests can pass a fake
type Spawn = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => { on(event: 'error', listener: (err: Error) => void): unknown; unref(): void };

/** The command that opens `url` in the default browser on `platform`. */
export function openCommand(url: string, platform: NodeJS.Platform): [string, string[]] {
  if (platform === 'darwin') return ['open', [url]];
  // `start` is built into cmd, and its first quoted argument is a window title
  if (platform === 'win32') return ['cmd', ['/c', 'start', '""', url]];
  return ['xdg-open', [url]];
}

/**
 * Open `url` without waiting for the browser. Errors are ignored, because there
 * may be no browser at all (Docker, SSH), and the URL is printed anyway.
 */
export function openBrowser(url: string, platform = process.platform, spawn: Spawn = nodeSpawn) {
  const [command, args] = openCommand(url, platform);
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    // Otherwise Node quotes `""` again and cmd takes it as the URL
    windowsVerbatimArguments: platform === 'win32',
  });
  child.on('error', () => {});
  child.unref();
}
