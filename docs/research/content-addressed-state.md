# Content-Addressed State

This document studies reproducibility, immutable manifests, and content-addressed storage ideas that may later inform attempt snapshots and lineage.

The goal is not to make v1 depend on Nix, OCI, Bazel, or BuildKit. The goal is to learn what they teach about:

- artifact identity
- lineage
- reproducibility
- cache reuse
- integrity

## Executive Summary

The strongest reusable lesson is:

> identity should come from content where possible, and metadata should point to immutable artifacts rather than pretending mutable state is always trustworthy.

For `agent-worktree`, that suggests a future where checkpoints, attempt artifacts, or reusable summaries may benefit from content-addressed or immutable references, but only after the simpler manifest and lifecycle model exists.

Confidence: `Medium-High`.

## Strong Ideas To Borrow

## 1. Immutable Artifact Identity

OCI, BuildKit, and similar systems rely heavily on immutable references or digests.

Reusable lesson:

- when an artifact matters, its identity should not depend only on a mutable filename or branch label

Why this matters:

- later attempt artifacts may need stable references
- comparison and replay become safer when artifacts are immutable

Documentation implication:

- safe as research vocabulary
- too early as a v1 manifest requirement

Confidence: `Medium-High`.

## 2. Lineage Is As Important As Payload

Content-addressed systems are useful because they preserve lineage:

- what produced this artifact
- what inputs it depended on
- what version of the process created it

Reusable lesson:

- future checkpoint or attempt artifacts should likely record lineage, not only data blobs

Why this matters:

- supports auditability
- supports selective reuse
- supports future debugging

Confidence: `Medium-High`.

## 3. Reproducibility Is More Than Caching

Reproducible build systems care not only about speed, but about trust.

Reusable lesson:

- cache reuse is useful only when integrity and reproducibility are understandable

Why this matters:

- future attempt reuse should not become hidden state leakage
- the project should prefer explicit provenance over magical performance shortcuts

Confidence: `Medium`.

## 4. Keep The First Version Smaller Than The Ideal Theory

The danger here is obvious:

- content-addressed storage is elegant
- full artifact graphs are attractive
- but they can easily overwhelm a docs-first v1

Reusable lesson:

- preserve the idea, but keep it in research until actual implementation pressure appears

Confidence: `High`.

## What To Write Publicly Now

Safe to write now:

- immutable or content-addressed artifacts may be useful later
- lineage matters for future checkpoints and artifacts
- reuse should preserve integrity, not just speed

Not safe to write into current public specs:

- digest fields in every manifest
- cache graph semantics
- exact storage layout
- reproducibility guarantees

## Selected Sources

- [OCI image manifest spec](https://specs.opencontainers.org/image-spec/manifest/)
- [Docker reproducible builds](https://docs.docker.com/build/ci/github-actions/reproducible-builds/)
- [BuildKit remote cache discussion](https://github.com/moby/buildkit/issues/2251)
- [Cargo metadata](https://doc.rust-lang.org/cargo/commands/cargo-metadata.html)
- [Reproducible Containers](https://github.com/reproducible-containers)
