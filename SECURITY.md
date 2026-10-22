# Security

## Reporting

Please report a vulnerability privately through GitHub's security advisory form for this repository. Include a minimal reproduction and the affected version.

## Untrusted text

Incident titles, signal summaries, and service error messages come from the systems being watched, and some of them are derived from log lines. Relay Dash strips terminal control sequences from that text before rendering it, so a crafted log line cannot move the cursor or change terminal settings.

## Tokens

The pack-sentinel API token is read from an environment variable, never from a command-line argument, so it does not appear in process listings or shell history. Relay Dash sends it only to the configured pack-sentinel address.
