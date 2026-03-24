# Specification Overview

## Purpose

This file defines the public specification scope for `agent-worktree`.

The goal of the spec set is to describe stable or intended public surfaces without prematurely locking internal implementation details.

## Non-Goals

The spec set does not currently define:

- internal storage implementation
- process model internals
- cache layouts
- telemetry pipelines
- final human-readable terminal output

## Normative Language

The key words `MUST`, `SHOULD`, `MAY`, and `MUST NOT` are used in their normal RFC-style meaning.

## Document Map

- [docs/specs/stability.md](docs/specs/stability.md)
- [docs/specs/config.md](docs/specs/config.md)
- [docs/specs/runtime-manifest.md](docs/specs/runtime-manifest.md)
- [docs/specs/cli.md](docs/specs/cli.md)
- [docs/specs/examples.md](docs/specs/examples.md)
- [docs/specs/testing.md](docs/specs/testing.md)

## Canonical Public Surfaces

The current intended public surfaces are:

- project configuration
- runtime manifest
- machine-readable CLI behavior
- compatibility tier definitions

## Source Discipline

- Public specs may contain only validated or explicitly provisional statements.
- Research hypotheses belong in `docs/research/`.
- Accepted durable decisions belong in `docs/adrs/`.
- Proposed cross-cutting changes belong in `rfcs/`.

## Current Status

All public surfaces described here are currently experimental.
