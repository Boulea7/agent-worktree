import { describe, expect, expectTypeOf, it } from "vitest";

import * as controlPlane from "../../src/control-plane/internal.js";
import type {
  ExecutionSessionCloseConsume,
  ExecutionSessionContext,
  ExecutionSessionRecord,
  ExecutionSessionSpawnHeadlessInput,
  ExecutionSessionSpawnRequest,
  ExecutionSessionWaitConsume
} from "../../src/control-plane/internal.js";

describe("control-plane internal exports", () => {
  it("should expose representative helpers for the current internal capability buckets", () => {
    const exportKeys = new Set(Object.keys(controlPlane));

    for (const key of [
      "buildExecutionSessionIndex",
      "deriveExecutionSessionRecord",
      "buildExecutionSessionView"
    ]) {
      expect(exportKeys.has(key)).toBe(true);
    }

    for (const key of [
      "deriveExecutionSessionContext",
      "deriveExecutionSessionLifecycleDisposition"
    ]) {
      expect(exportKeys.has(key)).toBe(true);
    }

    for (const key of [
      "deriveExecutionSessionSpawnReadiness",
      "deriveExecutionSessionSpawnCandidate",
      "deriveExecutionSessionSpawnTarget",
      "deriveExecutionSessionSpawnRequest"
    ]) {
      expect(exportKeys.has(key)).toBe(true);
    }

    for (const key of [
      "deriveExecutionSessionSpawnHeadlessInput",
      "applyExecutionSessionSpawnHeadlessInput",
      "executeExecutionSessionSpawnHeadless",
      "deriveExecutionSessionSpawnHeadlessRecord",
      "deriveExecutionSessionSpawnHeadlessView"
    ]) {
      expect(exportKeys.has(key)).toBe(true);
    }

    for (const key of [
      "deriveExecutionSessionWaitTarget",
      "consumeExecutionSessionWait",
      "deriveExecutionSessionCloseTarget",
      "consumeExecutionSessionClose"
    ]) {
      expect(exportKeys.has(key)).toBe(true);
    }
  });

  it("should keep control-plane internals free of unrelated selection and verification helpers", () => {
    expect(controlPlane).not.toHaveProperty("deriveAttemptSelectionCandidate");
    expect(controlPlane).not.toHaveProperty("deriveAttemptPromotionReport");
    expect(controlPlane).not.toHaveProperty("deriveAttemptVerificationPayload");
    expect(controlPlane).not.toHaveProperty("executeAttemptVerification");
  });

  it("should continue exporting representative repo-internal types across the current buckets", () => {
    type ControlPlaneInternalExports = {
      record: ExecutionSessionRecord;
      context: ExecutionSessionContext;
      spawnRequest: ExecutionSessionSpawnRequest;
      spawnHeadlessInput: ExecutionSessionSpawnHeadlessInput;
      waitConsume: ExecutionSessionWaitConsume;
      closeConsume: ExecutionSessionCloseConsume;
    };

    expectTypeOf<ControlPlaneInternalExports>().not.toBeAny();
  });
});
