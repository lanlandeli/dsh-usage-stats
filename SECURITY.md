# Security policy

## Supported versions

Security fixes are applied to the latest published `0.1.x` release. The verified
Harness baseline is recorded in `docs/COMPATIBILITY.md`.

## Reporting a vulnerability

Please use the repository's GitHub **Security → Report a vulnerability** flow.
Do not include API keys, prompts, session logs, or other private user data in a
public issue. Include the plugin version, Harness version, Node version, and a
minimal reproduction using synthetic data where possible.

## Trust boundaries

This plugin runs inside the Harness Host and Web UI processes. Review the source
and npm provenance before installation. The package does not add outbound
network requests; its registered HTTP API is same-origin and read-only.
