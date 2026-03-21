# Terminology

## Attempt

A single isolated run of a coding agent against a task.

## Task

A higher-level unit of work that may produce one or more attempts.

## Runtime

The target agent tool being driven, such as Claude Code or Codex CLI.

## Adapter

The integration layer that translates `agent-worktree` concepts into tool-specific behavior.

## Tier 1

First-class supported compatibility target with explicit documentation and expected smoke-test coverage.

## Experimental

Documented but not fully promised compatibility target.

## Safety Intent

A normalized statement of how much write access, approval, and sandbox freedom the platform is asking for.

## Project Guidance

The shared repository instructions that agents should follow, with `AGENTS.md` as the canonical source.

## Runtime Manifest

The durable machine-readable record of an attempt and its externally meaningful state.
