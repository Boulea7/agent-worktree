# Security Policy

## Scope

This repository is currently documentation-first and does not yet ship an implementation runtime.

Security concerns today are mostly about:

- accidental publication of secrets
- over-promising unsafe compatibility behaviors
- documenting risky local automation without warnings

## Reporting

Until a dedicated security channel is established, do not publish sensitive findings in public issues.

Open a private contact path before implementation begins, then update this file with official reporting instructions.

## Documentation Safety Rules

- Never commit credentials, tokens, or machine-specific auth files.
- Never commit raw transcripts that may contain sensitive prompts or file paths.
- Mark risky or privileged workflows explicitly in public docs.
- Treat MCP, hooks, shell execution, and plugin loading as trust boundaries in documentation.

## Current Limitations

- No formal vulnerability disclosure SLA yet
- No signed release process yet
- No implementation-level sandbox or isolation guarantees yet

These gaps are intentional and tracked as future work.
