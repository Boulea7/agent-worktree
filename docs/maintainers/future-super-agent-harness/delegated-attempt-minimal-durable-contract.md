# Delegated Attempt Minimal Durable Contract

Maintainer planning only. This document is a current planning hypothesis for a future branch. It does not modify the current public contract, roadmap status, or development-phase boundary.

## Summary

If the future branch introduces delegated attempts, it should define a minimal durable contract before implementing delegated execution behavior.

## Purpose

This contract exists to prevent the future branch from implementing child execution first and inventing state semantics afterward.

## Minimal Durable Fields

The future branch should likely persist at least:

- delegated attempt ID
- parent attempt ID
- delegation topology kind
- child execution status
- child result status
- verification status
- timestamps
- artifact references

## Minimal Semantic Questions

The future branch should answer these questions before execution lands:

- What counts as a delegated attempt versus a sibling peer attempt?
- Which fields are durable audit truth versus derived runtime state?
- What child result shapes are allowed?
- What makes a delegated attempt promotable, handoff-ready, or blocked?

## Chosen Boundary

This document does not promote any current manifest change on `main`.
If a later future branch wants to widen public manifest or CLI contracts, that must happen separately through RFC/spec work.
