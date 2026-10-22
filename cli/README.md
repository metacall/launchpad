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

Then open `http://localhost:9001`.

Without the MetaCall installer:

```sh
npx @metacall/launchpad
```

### Options

| Option      | Description                    |
| ----------- | ------------------------------ |
| `--version` | Print the version and exit     |

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
