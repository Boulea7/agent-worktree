import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import {
  deriveAttemptHandoffTarget,
  type AttemptPromotionTarget
} from "../../src/selection/internal.js";

describe("selection handoff-target helpers", () => {
  it("should return undefined when the supplied promotion target is undefined", () => {
    expect(deriveAttemptHandoffTarget(undefined)).toBeUndefined();
  });

  it("should derive a minimal handoff target from a valid promotion target", () => {
    expect(
      deriveAttemptHandoffTarget(
        createPromotionTarget({
          taskId: "task_shared",
          attemptId: "att_ready",
          runtime: "codex-cli",
          status: "running",
          sourceKind: "delegated"
        })
      )
    ).toEqual({
      handoffBasis: "promotion_target",
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "running",
      sourceKind: "delegated"
    });
  });

  it("should fail loudly when target.targetBasis is invalid", () => {
    const target = {
      ...createPromotionTarget(),
      targetBasis: "unexpected_basis"
    } as unknown as AttemptPromotionTarget;

    expect(() => deriveAttemptHandoffTarget(target)).toThrow(ValidationError);
    expect(() => deriveAttemptHandoffTarget(target)).toThrow(
      'Attempt handoff target requires target.targetBasis to be "promotion_decision_summary".'
    );
  });

  it("should fail loudly when target.taskId is not a string when provided", () => {
    const target = {
      ...createPromotionTarget(),
      taskId: 42
    } as unknown as AttemptPromotionTarget;

    expect(() => deriveAttemptHandoffTarget(target)).toThrow(
      "Attempt handoff target requires target.taskId to be a string when provided."
    );
  });

  it("should fail loudly when target.attemptId is empty", () => {
    const target = {
      ...createPromotionTarget(),
      attemptId: "   "
    } as unknown as AttemptPromotionTarget;

    expect(() => deriveAttemptHandoffTarget(target)).toThrow(
      "Attempt handoff target requires target.attemptId to be a non-empty string."
    );
  });

  it("should fail loudly when target.runtime is empty", () => {
    const target = {
      ...createPromotionTarget(),
      runtime: ""
    } as unknown as AttemptPromotionTarget;

    expect(() => deriveAttemptHandoffTarget(target)).toThrow(
      "Attempt handoff target requires target.runtime to be a non-empty string."
    );
  });

  it("should fail loudly when target.status uses an unknown attempt status", () => {
    const target = {
      ...createPromotionTarget(),
      status: "unknown"
    } as unknown as AttemptPromotionTarget;

    expect(() => deriveAttemptHandoffTarget(target)).toThrow(
      "Attempt handoff target requires target.status to use the existing attempt status vocabulary."
    );
  });

  it("should fail loudly when target.sourceKind uses an unknown source kind", () => {
    const target = {
      ...createPromotionTarget(),
      sourceKind: "sideways"
    } as unknown as AttemptPromotionTarget;

    expect(() => deriveAttemptHandoffTarget(target)).toThrow(
      "Attempt handoff target requires target.sourceKind to use the existing attempt source-kind vocabulary when provided."
    );
  });

  it("should not mutate the supplied promotion target and should return a fresh handoff target object", () => {
    const target = Object.freeze(createPromotionTarget());
    const snapshot = structuredClone(target);

    const handoffTarget = deriveAttemptHandoffTarget(target);

    expect(target).toEqual(snapshot);
    expect(handoffTarget).toEqual({
      handoffBasis: "promotion_target",
      taskId: "task_shared",
      attemptId: "att_ready",
      runtime: "codex-cli",
      status: "created",
      sourceKind: undefined
    });
    expect(handoffTarget).not.toBe(target as unknown);
  });

  it("should not leak promotion-only metadata or runtime internals into the derived handoff target", () => {
    const handoffTarget = deriveAttemptHandoffTarget({
      ...createPromotionTarget(),
      canPromote: true,
      blockingReasons: [],
      hasBlockingReasons: false,
      explanation: { code: "selected" },
      artifactSummary: { checks: [] },
      checks: [],
      session: { sessionId: "sess_123" },
      controlPlane: { nodeId: "node_123" },
      runtimeState: { state: "running" }
    } as AttemptPromotionTarget);

    expect(handoffTarget).toBeDefined();
    expect(handoffTarget).not.toHaveProperty("targetBasis");
    expect(handoffTarget).not.toHaveProperty("canPromote");
    expect(handoffTarget).not.toHaveProperty("blockingReasons");
    expect(handoffTarget).not.toHaveProperty("hasBlockingReasons");
    expect(handoffTarget).not.toHaveProperty("explanation");
    expect(handoffTarget).not.toHaveProperty("artifactSummary");
    expect(handoffTarget).not.toHaveProperty("checks");
    expect(handoffTarget).not.toHaveProperty("session");
    expect(handoffTarget).not.toHaveProperty("controlPlane");
    expect(handoffTarget).not.toHaveProperty("runtimeState");
  });
});

function createPromotionTarget(
  overrides: Partial<AttemptPromotionTarget> = {}
): AttemptPromotionTarget {
  return {
    targetBasis: "promotion_decision_summary",
    taskId: "task_shared",
    attemptId: "att_ready",
    runtime: "codex-cli",
    status: "created",
    sourceKind: undefined,
    ...overrides
  };
}
