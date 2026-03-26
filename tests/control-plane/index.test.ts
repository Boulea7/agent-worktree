import { describe, expect, it } from "vitest";

import * as controlPlane from "../../src/control-plane/index.js";

describe("control-plane index exports", () => {
  it("should keep the default barrel focused on read-only foundational helpers", () => {
    expect(Object.keys(controlPlane).sort()).toEqual([
      "buildExecutionSessionIndex",
      "buildExecutionSessionView",
      "buildSessionTreeIndex",
      "classifySessionLifecycleState",
      "deriveExecutionSessionContext",
      "deriveExecutionSessionLifecycleDisposition",
      "deriveExecutionSessionRecord",
      "deriveSessionNodeRef",
      "deriveSessionSnapshot",
      "executionSessionContextSelectionKinds",
      "executionSessionRecordSources",
      "listChildExecutionSessions",
      "normalizeSessionGuardrails",
      "resolveExecutionSessionRecord",
      "sessionLifecycleEventKinds",
      "sessionLifecycleStates",
      "sessionNodeKinds",
      "sessionSourceKinds"
    ]);

    expect(controlPlane).toHaveProperty("deriveSessionNodeRef");
    expect(controlPlane).toHaveProperty("deriveSessionSnapshot");
    expect(controlPlane).toHaveProperty("buildExecutionSessionIndex");
    expect(controlPlane).toHaveProperty("deriveExecutionSessionContext");
    expect(controlPlane).toHaveProperty("deriveExecutionSessionLifecycleDisposition");
    expect(controlPlane).toHaveProperty("buildExecutionSessionView");
    expect(controlPlane).toHaveProperty("resolveExecutionSessionRecord");
    expect(controlPlane).toHaveProperty("listChildExecutionSessions");

    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionSpawnCandidate");
    expect(controlPlane).not.toHaveProperty("consumeExecutionSessionSpawn");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionSpawn");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionSpawnTarget");
    expect(controlPlane).not.toHaveProperty("executionSessionSpawnBlockingReasons");
    expect(controlPlane).not.toHaveProperty("executionSessionSpawnRequestSourceKinds");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionWaitTarget");
    expect(controlPlane).not.toHaveProperty("consumeExecutionSessionWait");
    expect(controlPlane).not.toHaveProperty("executionSessionWaitBlockingReasons");
    expect(controlPlane).not.toHaveProperty("executionSessionWaitConsumerBlockingReasons");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionCloseTarget");
    expect(controlPlane).not.toHaveProperty("consumeExecutionSessionClose");
    expect(controlPlane).not.toHaveProperty("executionSessionCloseBlockingReasons");
    expect(controlPlane).not.toHaveProperty("executionSessionCloseConsumerBlockingReasons");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionSpawnHeadlessInput");
  });
});

// @ts-expect-error control-plane index must not export spawn targets
type ControlPlaneIndexShouldNotExportSpawnTarget = import("../../src/control-plane/index.js").ExecutionSessionSpawnTarget;

// @ts-expect-error control-plane index must not export wait targets
type ControlPlaneIndexShouldNotExportWaitTarget = import("../../src/control-plane/index.js").ExecutionSessionWaitTarget;

// @ts-expect-error control-plane index must not export close targets
type ControlPlaneIndexShouldNotExportCloseTarget = import("../../src/control-plane/index.js").ExecutionSessionCloseTarget;

// @ts-expect-error control-plane index must not export headless spawn inputs
type ControlPlaneIndexShouldNotExportSpawnHeadlessInput = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessInput;

// @ts-expect-error control-plane index must not export spawn blocking vocabularies
type ControlPlaneIndexShouldNotExportSpawnBlockingReasons = typeof import("../../src/control-plane/index.js").executionSessionSpawnBlockingReasons;

// @ts-expect-error control-plane index must not export wait consumer blocking vocabularies
type ControlPlaneIndexShouldNotExportWaitConsumerBlockingReasons = typeof import("../../src/control-plane/index.js").executionSessionWaitConsumerBlockingReasons;

// @ts-expect-error control-plane index must not export close consumer blocking vocabularies
type ControlPlaneIndexShouldNotExportCloseConsumerBlockingReasons = typeof import("../../src/control-plane/index.js").executionSessionCloseConsumerBlockingReasons;
