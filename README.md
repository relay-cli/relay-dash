# Relay Dash

Relay Dash is a terminal dashboard for the services we run. It shows open findings from [pack-sentinel](https://github.com/dispersal-wolves/pack-sentinel) next to the status of the impossibleG services: which models are loaded, how deep each request queue is, and whether every service is live and ready.

## Try it

```sh
npm install
npm run dev
```

Press `r` to refresh now and `q` to quit. To print one frame without opening the interactive screen:

```sh
npx tsx src/cli.tsx --snapshot
```

## Sources

By default Relay Dash polls pack-sentinel at `http://127.0.0.1:7331` and Impossible Inference at `http://127.0.0.1:8080`. To watch more services, copy [`relay-dash.example.json`](./relay-dash.example.json) to `relay-dash.json` in the directory you run from, or pass sources on the command line:

```sh
relay-dash --sentinel http://den:7331 --service inference=http://127.0.0.1:8080 --service ocr=http://127.0.0.1:8082
```

Set `"sentinel": false` in the file, or pass `--no-sentinel`, to watch services only.

When pack-sentinel has `apiToken` set, put the token in `RELAY_DASH_SENTINEL_TOKEN` (or the variable named by `sentinel.tokenEnv`). Relay Dash refuses a token written in the config file.

| Source               | What Relay Dash reads                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| pack-sentinel        | `/api/v1/health`, `/api/v1/state`, open and acknowledged `/api/v1/incidents`, recent `/api/v1/signals`                                               |
| impossibleG services | `/health/live` and `/health/ready` (or `/healthz` and `/readyz`), `/v1/models`, and `impossible_queue_depth` and `*_active_requests` from `/metrics` |

## Check once

`--json` polls every source once, prints the results, and exits with status 1 if pack-sentinel is unreachable or any service is not ready. It works in scripts and cron jobs:

```sh
relay-dash --json --no-sentinel --service inference=http://127.0.0.1:8080
```

## Development

```sh
npm run check
```

Relay Dash requires Node.js 22 or newer. See [the architecture notes](./docs/architecture.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
