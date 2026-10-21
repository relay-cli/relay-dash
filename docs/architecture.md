# Architecture

Relay Dash is a read-only view over two kinds of source.

1. **pack-sentinel** exposes an HTTP API under `/api/v1` with health, collector state, incidents, and signals.
2. **impossibleG services** (inference, embeddings, OCR, voice, MCP, and the ReAct agent) each expose health checks, an OpenAI-style `/v1/models` list, and Prometheus metrics that include the request queue depth.

Each source has a small client that turns responses into plain data. A polling loop calls the clients on an interval, and the views render whatever the last poll returned, including the error when a source is unreachable.

The frame, keybindings, and status bar will come from [Relay Shell](https://github.com/relay-cli/relay-shell) once it is published. Until then `src/views/Frame.tsx` is a minimal stand-in with the same props as Relay Shell's `ShellFrame`.
