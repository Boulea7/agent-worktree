# Examples

These examples are informative, not normative.

## Minimal Project Config Example

```yaml
version: "0.x"

compatibility:
  tier1:
    - claude-code
    - codex-cli
    - gemini-cli
    - opencode
  experimental:
    - openclaw

instructions:
  canonical_file: AGENTS.md
  tool_adapters:
    claude_code: CLAUDE.md
    gemini_cli: GEMINI.md
```

## Minimal Runtime Manifest Example

```json
{
  "schemaVersion": "0.x",
  "attemptId": "att_demo",
  "taskId": "task_docs",
  "runtime": "claude-code",
  "adapter": "subprocess",
  "repoRoot": "/repos/agent-worktree",
  "status": "created",
  "verification": {
    "state": "pending",
    "checks": []
  }
}
```

## Non-Interactive CLI Example

```text
agent-worktree compat show codex-cli --json
```

## Invalid Config Example

```yaml
defaults:
  execution_mode: headless_event_stream
```

Invalid because `version` is missing.

## Deprecation Example

Future versions may mark fields as deprecated before removal.
Until a surface is stable, examples should not be interpreted as compatibility promises.

## Attempt List Example

```json
{
  "ok": false,
  "command": "attempt.list",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid attempt manifest for att_broken."
  }
}
```

This example shows two intended Phase 2 behaviors:

- cleaned attempts still appear in default list output when manifests are valid
- invalid manifests fail the command instead of being silently skipped

## Attempt Cleanup Example

```text
agent-worktree attempt cleanup --attempt-id att_demo --json
```

```json
{
  "ok": true,
  "command": "attempt.cleanup",
  "data": {
    "attempt": {
      "attemptId": "att_demo",
      "status": "cleaned",
      "sourceKind": "direct",
      "repoRoot": "/repos/agent-worktree",
      "worktreePath": "<worktree_path>"
    },
    "cleanup": {
      "outcome": "removed",
      "worktreeRemoved": true
    }
  }
}
```

This example is intentionally structured around explicit cleanup outcomes rather than free-form terminal text.
Missing attempts and invalid manifests return structured error envelopes instead of widening the success payload.
