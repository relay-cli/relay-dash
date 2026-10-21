# Relay Dash

Relay Dash is a terminal dashboard for the services we run. It shows open findings from [pack-sentinel](https://github.com/dispersal-wolves/pack-sentinel) next to the status of the impossibleG services: which models are loaded, how deep each request queue is, and whether every service is live and ready.

## Try it

```sh
npm install
npm run dev
```

Press `q` to quit. To print one frame without opening the interactive screen:

```sh
npx tsx src/cli.tsx --snapshot
```

## Development

```sh
npm run check
```

Relay Dash requires Node.js 22 or newer. See [the architecture notes](./docs/architecture.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
