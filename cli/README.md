# @metacall/launchpad

The [MetaCall Launchpad](https://github.com/metacall/launchpad) dashboard for a local
[MetaCall FaaS](https://github.com/metacall/faas), packaged as a command line tool.

It serves the built dashboard on `http://localhost:9001` and tells it to run in local mode
(through `/__launchpad/config`), so you can see and manage the apps deployed to your local FaaS.
The dashboard's API and function calls go to the same origin, and Launchpad forwards them
unchanged to FaaS on `http://localhost:9000`.

## Usage

With MetaCall installed, start the local FaaS and then Launchpad:

```sh
metacall faas
metacall launchpad
```

It opens `http://localhost:9001` in your browser. If FaaS isn't running yet, Launchpad says so
and keeps running, and the dashboard works as soon as FaaS is started.

Without the MetaCall installer:

```sh
npx @metacall/launchpad
```

### Options

| Option             | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `--port <port>`    | Port to serve the dashboard on (default `9001`)             |
| `--faas-url <url>` | Address of the local FaaS (default `http://localhost:9000`) |
| `--no-open`        | Don't open the dashboard in the browser                     |
| `--version`        | Print the version and exit                                  |
| `--help`           | Print the options and exit                                  |

Launchpad only listens on `127.0.0.1`, and other websites can't use it to deploy or delete
apps, because a local FaaS has no login.

## Development

The package lives in the `cli/` folder of the launchpad repository. Its build bundles the
dashboard from the repository root, so install both:

```sh
npm ci              # in the repository root
cd cli
npm ci
npm run build       # bundles the dashboard into dist/public and compiles the server
npm test
node dist/index.js
```
