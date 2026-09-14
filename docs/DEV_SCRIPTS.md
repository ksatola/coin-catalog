# Coin Catalog — Development Scripts

This document describes the repository's local development helper scripts.

## `./start`

Starts the backend and frontend development servers and records their process IDs under `/tmp/coin-catalog/`.

After starting, it prints a compact status table with:

- service name,
- process status,
- PID,
- local address.

It also prints the paths of the backend and frontend log files.

The managed services are:

```text
backend   http://localhost:8000
frontend  http://localhost:5173
```

## `./stop`

Stops the backend and frontend processes managed by the helper scripts.

After stopping, it prints a compact status table showing whether each managed service is stopped or still associated with a PID file.

The script manages the process groups created by `./start`. Processes started manually in other terminals are not tracked by these PID files and are therefore not managed by `./stop`.

## `./restart`

`./restart` intentionally contains no service-management logic of its own. It simply runs:

```text
./stop
./start
```

All start/stop behavior and normal status output therefore remains centralized in those two scripts.

## `./status`

Provides more detailed development diagnostics without changing the normal `start`/`stop` workflow.

For each service it reports:

- whether the managed PID is alive,
- whether the expected port is listening,
- the local URL.

The current port checks use `ss`.

The diagnostic script is intentionally separate so that additional troubleshooting commands can be added later without making normal startup output noisy.

## Troubleshooting

The development container includes the basic process and network diagnostic utilities used by these scripts and by manual troubleshooting:

- `procps` — process inspection utilities such as `ps`, `pgrep`, and `pkill`;
- `iproute2` — networking utilities including `ss`;
- `psmisc` — utilities including `fuser`.

These tools are intended for development diagnostics and do not form part of the application runtime.
