# Stability Levels

All surfaces in this repository are currently `experimental`.

## Levels

### Experimental

- May change without backward compatibility guarantees
- Safe for research, prototyping, and iteration
- Must still be documented clearly

### Beta

- Intended for broader early usage
- Additive changes are preferred
- Breaking changes require migration notes

### Stable

- Backward compatibility is expected
- Breaking changes require a deprecation path
- Machine-readable contracts must be versioned

## Surface Matrix

| Surface | Current level | Notes |
| --- | --- | --- |
| Terminology docs | Experimental | May be refined as the product model settles |
| Compatibility tiers | Experimental | Tier names may stabilize before implementation |
| `agent-worktree.yaml` | Experimental | Top-level shape may change |
| Runtime manifest | Experimental | Minimal contract only |
| CLI command tree | Experimental | Human-facing wording is non-contractual |
| Machine-readable CLI output | Experimental | Will become a priority stabilization target |
| Tooling matrix | Experimental | Should remain accurate, but scope may evolve |

## What We Intend To Stabilize First

Now that implementation has begun, the likely order of stabilization is:

1. config file shape
2. runtime manifest shape
3. machine-readable CLI output
4. compatibility tier semantics

## What Is Explicitly Non-Contractual Right Now

- internal process topology
- cache locations
- telemetry structure
- human-readable terminal text
- progress log wording
- exact research-track sequencing

## Deprecation Intent

Before a surface is marked `stable`, it may change rapidly.
After a surface is marked `stable`, deprecation guidance must be added before removal.
