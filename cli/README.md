# @metacall/launchpad

The [MetaCall Launchpad](https://github.com/metacall/launchpad) dashboard for a local
[MetaCall FaaS](https://github.com/metacall/faas), packaged as a command line tool.

It serves the built dashboard on `http://localhost:9001` and tells it to run in local mode
(through `/__launchpad/config`), so you can see and manage the apps deployed to your local FaaS.

## Usage

With MetaCall installed, start the local FaaS and then Launchpad:

```sh
metacall faas
metacall launchpad
```

Then open `http://localhost:9001`.

The CLI opens this URL in your default browser automatically (set `CI=1` to
disable that behavior).

Without the MetaCall installer:

```sh
npx @metacall/launchpad
```

### Options

| Option      | Description                    |
| ----------- | ------------------------------ |
| `--port <port>` | Port used by Launchpad (default: `9001`) |
| `--faas-url <url>` | Local FaaS URL (default: `http://localhost:9000`) |
| `--version` | Print the version and exit |

Launchpad proxies dashboard API and function requests to the FaaS URL, avoiding CORS
issues while keeping the dashboard and FaaS processes separate. If your FaaS uses a
different port, for example:

```sh
npx @metacall/launchpad --port 9010 --faas-url http://localhost:9100
```

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
