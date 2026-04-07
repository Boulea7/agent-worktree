import { describe, expect, expectTypeOf, it } from "vitest";

import * as controlPlane from "../../src/control-plane/internal.js";
import type {
  ExecutionSessionSpawnBatchHeadlessApply,
  ExecutionSessionSpawnBatchHeadlessApplyItems,
  ExecutionSessionCloseApply,
  ExecutionSessionCloseApplyBatch,
  ExecutionSessionCloseCandidate,
  ExecutionSessionCloseConsume,
  ExecutionSessionCloseConsumeBatch,
  ExecutionSessionCloseConsumer,
  ExecutionSessionContext,
  ExecutionSessionCloseRecordedEvent,
  ExecutionSessionCloseRequest,
  ExecutionSessionCloseRequestedEvent,
  ExecutionSessionCloseTargetApply,
  ExecutionSessionCloseTargetApplyBatch,
  ExecutionSessionRecord,
  ExecutionSessionSpawnBatchItemsApply,
  ExecutionSessionSpawnBatchItems,
  ExecutionSessionSpawnBatchPlan,
  ExecutionSessionSpawnBudget,
  ExecutionSessionSpawnCandidate,
  ExecutionSessionSpawnHeadlessCloseCandidate,
  ExecutionSessionSpawnHeadlessCloseRequest,
  ExecutionSessionSpawnHeadlessCloseRequestBatch,
  ExecutionSessionSpawnHeadlessCloseTargetApply,
  ExecutionSessionSpawnHeadlessCloseTargetApplyBatch,
  ExecutionSessionSpawnHeadlessCloseTarget,
  ExecutionSessionSpawnHeadlessInput,
  ExecutionSessionSpawnHeadlessWaitRequest,
  ExecutionSessionSpawnHeadlessWaitRequestBatch,
  ExecutionSessionSpawnHeadlessWaitTargetApply,
  ExecutionSessionSpawnHeadlessWaitTargetApplyBatch,
  ExecutionSessionSpawnRequest,
  ExecutionSessionWaitApply,
  ExecutionSessionWaitApplyBatch,
  ExecutionSessionWaitConsume,
  ExecutionSessionWaitTargetApply,
  ExecutionSessionWaitTargetApplyBatch
} from "../../src/control-plane/internal.js";

describe("control-plane internal exports", () => {
  it("should keep the internal barrel on an explicit repo-internal allowlist", () => {
    expect(Object.keys(controlPlane).sort()).toEqual([
      "applyExecutionSessionClose",
      "applyExecutionSessionCloseBatch",
      "applyExecutionSessionCloseTarget",
      "applyExecutionSessionCloseTargetBatch",
      "applyExecutionSessionSpawn",
      "applyExecutionSessionSpawnBatch",
      "applyExecutionSessionSpawnBatchHeadlessApply",
      "applyExecutionSessionSpawnBatchItems",
      "applyExecutionSessionSpawnHeadlessCloseTarget",
      "applyExecutionSessionSpawnHeadlessCloseTargetBatch",
      "applyExecutionSessionSpawnHeadlessInput",
      "applyExecutionSessionSpawnHeadlessInputBatch",
      "applyExecutionSessionSpawnHeadlessWaitTarget",
      "applyExecutionSessionSpawnHeadlessWaitTargetBatch",
      "applyExecutionSessionWait",
      "applyExecutionSessionWaitBatch",
      "applyExecutionSessionWaitTarget",
      "applyExecutionSessionWaitTargetBatch",
      "buildExecutionSessionIndex",
      "buildExecutionSessionView",
      "buildSessionTreeIndex",
      "classifySessionLifecycleState",
      "consumeExecutionSessionClose",
      "consumeExecutionSessionCloseBatch",
      "consumeExecutionSessionSpawn",
      "consumeExecutionSessionSpawnBatch",
      "consumeExecutionSessionWait",
      "consumeExecutionSessionWaitBatch",
      "deriveExecutionSessionCloseCandidate",
      "deriveExecutionSessionCloseConsumer",
      "deriveExecutionSessionCloseConsumerReadiness",
      "deriveExecutionSessionCloseReadiness",
      "deriveExecutionSessionCloseRecordedEvent",
      "deriveExecutionSessionCloseRequest",
      "deriveExecutionSessionCloseRequestedEvent",
      "deriveExecutionSessionCloseTarget",
      "deriveExecutionSessionContext",
      "deriveExecutionSessionLifecycleDisposition",
      "deriveExecutionSessionRecord",
      "deriveExecutionSessionSpawnBatchHeadlessApplyItems",
      "deriveExecutionSessionSpawnBatchItems",
      "deriveExecutionSessionSpawnBatchPlan",
      "deriveExecutionSessionSpawnBudget",
      "deriveExecutionSessionSpawnCandidate",
      "deriveExecutionSessionSpawnEffects",
      "deriveExecutionSessionSpawnEffectsBatch",
      "deriveExecutionSessionSpawnHeadlessCloseCandidate",
      "deriveExecutionSessionSpawnHeadlessCloseCandidateBatch",
      "deriveExecutionSessionSpawnHeadlessCloseRequest",
      "deriveExecutionSessionSpawnHeadlessCloseRequestBatch",
      "deriveExecutionSessionSpawnHeadlessCloseTarget",
      "deriveExecutionSessionSpawnHeadlessCloseTargetBatch",
      "deriveExecutionSessionSpawnHeadlessContext",
      "deriveExecutionSessionSpawnHeadlessContextBatch",
      "deriveExecutionSessionSpawnHeadlessInput",
      "deriveExecutionSessionSpawnHeadlessInputBatch",
      "deriveExecutionSessionSpawnHeadlessRecord",
      "deriveExecutionSessionSpawnHeadlessRecordBatch",
      "deriveExecutionSessionSpawnHeadlessView",
      "deriveExecutionSessionSpawnHeadlessViewBatch",
      "deriveExecutionSessionSpawnHeadlessWaitCandidate",
      "deriveExecutionSessionSpawnHeadlessWaitCandidateBatch",
      "deriveExecutionSessionSpawnHeadlessWaitRequest",
      "deriveExecutionSessionSpawnHeadlessWaitRequestBatch",
      "deriveExecutionSessionSpawnHeadlessWaitTarget",
      "deriveExecutionSessionSpawnHeadlessWaitTargetBatch",
      "deriveExecutionSessionSpawnLineage",
      "deriveExecutionSessionSpawnReadiness",
      "deriveExecutionSessionSpawnRecordedEvent",
      "deriveExecutionSessionSpawnRequest",
      "deriveExecutionSessionSpawnRequestedEvent",
      "deriveExecutionSessionSpawnTarget",
      "deriveExecutionSessionWaitCandidate",
      "deriveExecutionSessionWaitConsumer",
      "deriveExecutionSessionWaitConsumerReadiness",
      "deriveExecutionSessionWaitReadiness",
      "deriveExecutionSessionWaitRequest",
      "deriveExecutionSessionWaitTarget",
      "deriveSessionNodeRef",
      "deriveSessionSnapshot",
      "executeExecutionSessionSpawnHeadless",
      "executeExecutionSessionSpawnHeadlessBatch",
      "executionSessionCloseBlockingReasons",
      "executionSessionCloseConsumerBlockingReasons",
      "executionSessionContextSelectionKinds",
      "executionSessionRecordSources",
      "executionSessionSpawnBlockingReasons",
      "executionSessionSpawnRequestSourceKinds",
      "executionSessionWaitBlockingReasons",
      "executionSessionWaitConsumerBlockingReasons",
      "listChildExecutionSessions",
      "normalizeSessionGuardrails",
      "resolveExecutionSessionRecord",
      "sessionLifecycleEventKinds",
      "sessionLifecycleStates",
      "sessionNodeKinds",
      "sessionSourceKinds"
    ]);
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
      spawnBudget: ExecutionSessionSpawnBudget;
      spawnCandidate: ExecutionSessionSpawnCandidate;
      spawnBatchHeadlessApply: ExecutionSessionSpawnBatchHeadlessApply;
      spawnBatchHeadlessApplyItems: ExecutionSessionSpawnBatchHeadlessApplyItems;
      spawnBatchItemsApply: ExecutionSessionSpawnBatchItemsApply;
      spawnBatchItems: ExecutionSessionSpawnBatchItems;
      spawnBatchPlan: ExecutionSessionSpawnBatchPlan;
      spawnRequest: ExecutionSessionSpawnRequest;
      spawnHeadlessInput: ExecutionSessionSpawnHeadlessInput;
      spawnHeadlessWaitRequest: ExecutionSessionSpawnHeadlessWaitRequest;
      spawnHeadlessWaitRequestBatch: ExecutionSessionSpawnHeadlessWaitRequestBatch;
      spawnHeadlessCloseCandidate: ExecutionSessionSpawnHeadlessCloseCandidate;
      spawnHeadlessCloseRequest: ExecutionSessionSpawnHeadlessCloseRequest;
      spawnHeadlessCloseRequestBatch: ExecutionSessionSpawnHeadlessCloseRequestBatch;
      spawnHeadlessCloseTarget: ExecutionSessionSpawnHeadlessCloseTarget;
      spawnHeadlessCloseTargetApply: ExecutionSessionSpawnHeadlessCloseTargetApply;
      spawnHeadlessCloseTargetApplyBatch: ExecutionSessionSpawnHeadlessCloseTargetApplyBatch;
      spawnHeadlessWaitTargetApply: ExecutionSessionSpawnHeadlessWaitTargetApply;
      spawnHeadlessWaitTargetApplyBatch: ExecutionSessionSpawnHeadlessWaitTargetApplyBatch;
      waitApply: ExecutionSessionWaitApply;
      waitApplyBatch: ExecutionSessionWaitApplyBatch;
      waitTargetApply: ExecutionSessionWaitTargetApply;
      waitTargetApplyBatch: ExecutionSessionWaitTargetApplyBatch;
      waitConsume: ExecutionSessionWaitConsume;
      closeApply: ExecutionSessionCloseApply;
      closeApplyBatch: ExecutionSessionCloseApplyBatch;
      closeTargetApply: ExecutionSessionCloseTargetApply;
      closeTargetApplyBatch: ExecutionSessionCloseTargetApplyBatch;
      closeCandidate: ExecutionSessionCloseCandidate;
      closeRequest: ExecutionSessionCloseRequest;
      closeRequestedEvent: ExecutionSessionCloseRequestedEvent;
      closeRecordedEvent: ExecutionSessionCloseRecordedEvent;
      closeConsumer: ExecutionSessionCloseConsumer;
      closeConsume: ExecutionSessionCloseConsume;
      closeConsumeBatch: ExecutionSessionCloseConsumeBatch;
    };

    expectTypeOf<ControlPlaneInternalExports>().not.toBeAny();
  });
});

// @ts-expect-error control-plane internal barrel must not export selection candidate types
type ControlPlaneInternalShouldNotExportSelectionCandidate = import("../../src/control-plane/internal.js").AttemptSelectionCandidate;

// @ts-expect-error control-plane internal barrel must not export verification summary types
type ControlPlaneInternalShouldNotExportVerificationSummary = import("../../src/control-plane/internal.js").AttemptVerificationSummary;

// @ts-expect-error control-plane internal barrel must not export selection helpers
type ControlPlaneInternalShouldNotExportSelectionHelper = typeof import("../../src/control-plane/internal.js").deriveAttemptSelectionCandidate;

// @ts-expect-error control-plane internal barrel must not export verification helpers
type ControlPlaneInternalShouldNotExportVerificationHelper = typeof import("../../src/control-plane/internal.js").deriveAttemptVerificationSummary;
