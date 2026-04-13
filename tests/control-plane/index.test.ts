import { describe, expect, expectTypeOf, it } from "vitest";

import * as controlPlane from "../../src/control-plane/index.js";

describe("control-plane index exports", () => {
  it("should keep the current public type surface explicit", () => {
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionLifecycleEventKind
    >().not.toBeAny();
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionLifecycleState
    >().not.toBeAny();
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionLifecycleStateInput
    >().not.toBeAny();
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionNodeKind
    >().not.toBeAny();
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionNodeRef
    >().not.toBeAny();
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionNodeRefInput
    >().not.toBeAny();
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionSnapshot
    >().not.toBeAny();
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionSnapshotInput
    >().not.toBeAny();
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionGuardrails
    >().not.toBeAny();
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionSourceKind
    >().not.toBeAny();
    expectTypeOf<
      import("../../src/control-plane/index.js").SessionTreeIndex
    >().not.toBeAny();
  });

  it("should keep the default barrel focused on read-only foundational helpers", () => {
    expect(Object.keys(controlPlane).sort()).toEqual([
      "buildSessionTreeIndex",
      "classifySessionLifecycleState",
      "deriveSessionNodeRef",
      "deriveSessionSnapshot",
      "normalizeSessionGuardrails",
      "sessionLifecycleEventKinds",
      "sessionLifecycleStates",
      "sessionNodeKinds",
      "sessionSourceKinds"
    ]);

    expect(controlPlane).toHaveProperty("deriveSessionNodeRef");
    expect(controlPlane).toHaveProperty("deriveSessionSnapshot");
    expect(controlPlane).toHaveProperty("buildSessionTreeIndex");
    expect(controlPlane).toHaveProperty("classifySessionLifecycleState");
    expect(controlPlane).toHaveProperty("normalizeSessionGuardrails");

    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionSpawnCandidate");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionSpawnBudget");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionSpawnBatchPlan");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionSpawnBatchItems");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionSpawnBatchHeadlessApply");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionSpawnBatchItems");
    expect(controlPlane).not.toHaveProperty("consumeExecutionSessionSpawn");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionSpawn");
    expect(controlPlane).not.toHaveProperty("buildExecutionSessionIndex");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionRecord");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionContext");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionLifecycleDisposition");
    expect(controlPlane).not.toHaveProperty("buildExecutionSessionView");
    expect(controlPlane).not.toHaveProperty("resolveExecutionSessionRecord");
    expect(controlPlane).not.toHaveProperty("listChildExecutionSessions");
    expect(controlPlane).not.toHaveProperty("executionSessionContextSelectionKinds");
    expect(controlPlane).not.toHaveProperty("executionSessionRecordSources");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionSpawnTarget");
    expect(controlPlane).not.toHaveProperty("executionSessionSpawnBlockingReasons");
    expect(controlPlane).not.toHaveProperty("executionSessionSpawnRequestSourceKinds");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionWaitTarget");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionWait");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionWaitBatch");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionWaitTarget");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionWaitTargetBatch");
    expect(controlPlane).not.toHaveProperty("consumeExecutionSessionWait");
    expect(controlPlane).not.toHaveProperty("executionSessionWaitBlockingReasons");
    expect(controlPlane).not.toHaveProperty("executionSessionWaitConsumerBlockingReasons");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionCloseCandidate");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionCloseReadiness");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionCloseRequest");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionCloseRequestedEvent");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionCloseRecordedEvent");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionCloseConsumerReadiness");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionCloseConsumer");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionCloseTarget");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionClose");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionCloseBatch");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionCloseTarget");
    expect(controlPlane).not.toHaveProperty("applyExecutionSessionCloseTargetBatch");
    expect(controlPlane).not.toHaveProperty("consumeExecutionSessionClose");
    expect(controlPlane).not.toHaveProperty("consumeExecutionSessionCloseBatch");
    expect(controlPlane).not.toHaveProperty("executionSessionCloseBlockingReasons");
    expect(controlPlane).not.toHaveProperty("executionSessionCloseConsumerBlockingReasons");
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionSpawnHeadlessInput");
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessInputBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "executeExecutionSessionSpawnHeadless"
    );
    expect(controlPlane).not.toHaveProperty(
      "executeExecutionSessionSpawnHeadlessBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessRecord"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessRecordBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessView"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessViewBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessContext"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessContextBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessWaitCandidate"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessWaitCandidateBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessWaitTarget"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessWaitTargetBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnRequestedEvent"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnRecordedEvent"
    );
    expect(controlPlane).not.toHaveProperty("deriveExecutionSessionWaitRequest");
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessCloseCandidate"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessCloseCandidateBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessCloseRequest"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessCloseRequestBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessCloseTarget"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessCloseTargetBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "applyExecutionSessionSpawnHeadlessWaitTarget"
    );
    expect(controlPlane).not.toHaveProperty(
      "applyExecutionSessionSpawnHeadlessWaitTargetBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessWaitRequest"
    );
    expect(controlPlane).not.toHaveProperty(
      "deriveExecutionSessionSpawnHeadlessWaitRequestBatch"
    );
    expect(controlPlane).not.toHaveProperty(
      "applyExecutionSessionSpawnHeadlessCloseTarget"
    );
    expect(controlPlane).not.toHaveProperty(
      "applyExecutionSessionSpawnHeadlessCloseTargetBatch"
    );
    expect(controlPlane).not.toHaveProperty("normalizeHeadlessTargetWrapper");
    expect(controlPlane).not.toHaveProperty("normalizeHeadlessTargetBatchWrapper");
    expect(controlPlane).not.toHaveProperty("normalizeBatchWrapper");
    expect(controlPlane).not.toHaveProperty("normalizeBatchWrapperItems");
  });
});

// @ts-expect-error control-plane index must not export spawn targets
type ControlPlaneIndexShouldNotExportSpawnTarget = import("../../src/control-plane/index.js").ExecutionSessionSpawnTarget;

// @ts-expect-error control-plane index must not export spawn budget types
type ControlPlaneIndexShouldNotExportExecutionSessionSpawnBudget = import("../../src/control-plane/index.js").ExecutionSessionSpawnBudget;

// @ts-expect-error control-plane index must not export spawn candidate types
type ControlPlaneIndexShouldNotExportExecutionSessionSpawnCandidate = import("../../src/control-plane/index.js").ExecutionSessionSpawnCandidate;

// @ts-expect-error control-plane index must not export spawn batch plan types
type ControlPlaneIndexShouldNotExportExecutionSessionSpawnBatchPlan = import("../../src/control-plane/index.js").ExecutionSessionSpawnBatchPlan;

// @ts-expect-error control-plane index must not export spawn batch item types
type ControlPlaneIndexShouldNotExportExecutionSessionSpawnBatchItems = import("../../src/control-plane/index.js").ExecutionSessionSpawnBatchItems;

// @ts-expect-error control-plane index must not export spawn batch headless apply types
type ControlPlaneIndexShouldNotExportExecutionSessionSpawnBatchHeadlessApply = import("../../src/control-plane/index.js").ExecutionSessionSpawnBatchHeadlessApply;

// @ts-expect-error control-plane index must not export spawn batch headless apply item projection types
type ControlPlaneIndexShouldNotExportExecutionSessionSpawnBatchHeadlessApplyItems = import("../../src/control-plane/index.js").ExecutionSessionSpawnBatchHeadlessApplyItems;

// @ts-expect-error control-plane index must not export spawn batch item apply types
type ControlPlaneIndexShouldNotExportExecutionSessionSpawnBatchItemsApply = import("../../src/control-plane/index.js").ExecutionSessionSpawnBatchItemsApply;

// @ts-expect-error control-plane index must not export execution-session record types
type ControlPlaneIndexShouldNotExportExecutionSessionRecord = import("../../src/control-plane/index.js").ExecutionSessionRecord;

// @ts-expect-error control-plane index must not export execution-session context types
type ControlPlaneIndexShouldNotExportExecutionSessionContext = import("../../src/control-plane/index.js").ExecutionSessionContext;

// @ts-expect-error control-plane index must not export execution-session selector types
type ControlPlaneIndexShouldNotExportExecutionSessionSelector = import("../../src/control-plane/index.js").ExecutionSessionSelector;

// @ts-expect-error control-plane index must not export execution-session view types
type ControlPlaneIndexShouldNotExportExecutionSessionView = import("../../src/control-plane/index.js").ExecutionSessionView;

// @ts-expect-error control-plane index must not export execution-session context selection-kind types
type ControlPlaneIndexShouldNotExportExecutionSessionContextSelectionKind = import("../../src/control-plane/index.js").ExecutionSessionContextSelectionKind;

// @ts-expect-error control-plane index must not export execution-session record-source types
type ControlPlaneIndexShouldNotExportExecutionSessionRecordSource = import("../../src/control-plane/index.js").ExecutionSessionRecordSource;

// @ts-expect-error control-plane index must not export execution-session lifecycle disposition types
type ControlPlaneIndexShouldNotExportExecutionSessionLifecycleDisposition = import("../../src/control-plane/index.js").ExecutionSessionLifecycleDisposition;

// @ts-expect-error control-plane index must not export session lifecycle capability resolver types
type ControlPlaneIndexShouldNotExportSessionLifecycleCapabilityResolver = import("../../src/control-plane/index.js").SessionLifecycleCapabilityResolver;

// @ts-expect-error control-plane index must not export wait targets
type ControlPlaneIndexShouldNotExportWaitTarget = import("../../src/control-plane/index.js").ExecutionSessionWaitTarget;

// @ts-expect-error control-plane index must not export wait candidates
type ControlPlaneIndexShouldNotExportWaitCandidate = import("../../src/control-plane/index.js").ExecutionSessionWaitCandidate;

// @ts-expect-error control-plane index must not export wait readiness types
type ControlPlaneIndexShouldNotExportWaitReadiness = import("../../src/control-plane/index.js").ExecutionSessionWaitReadiness;

// @ts-expect-error control-plane index must not export wait apply results
type ControlPlaneIndexShouldNotExportWaitApply = import("../../src/control-plane/index.js").ExecutionSessionWaitApply;

// @ts-expect-error control-plane index must not export wait apply batch results
type ControlPlaneIndexShouldNotExportWaitApplyBatch = import("../../src/control-plane/index.js").ExecutionSessionWaitApplyBatch;

// @ts-expect-error control-plane index must not export headless wait request input types
type ControlPlaneIndexShouldNotExportSpawnHeadlessWaitRequestInput = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessWaitRequestInput;

// @ts-expect-error control-plane index must not export headless close candidate batch types
type ControlPlaneIndexShouldNotExportSpawnHeadlessCloseCandidateBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessCloseCandidateBatch;

// @ts-expect-error control-plane index must not export headless close target batch types
type ControlPlaneIndexShouldNotExportSpawnHeadlessCloseTargetBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessCloseTargetBatch;

// @ts-expect-error control-plane index must not export close consumer blocker vocabulary
type ControlPlaneIndexShouldNotExportCloseConsumerBlockingReason = import("../../src/control-plane/index.js").ExecutionSessionCloseConsumerBlockingReason;

// @ts-expect-error control-plane index must not export wait consumers
type ControlPlaneIndexShouldNotExportWaitConsumer = import("../../src/control-plane/index.js").ExecutionSessionWaitConsumer;

// @ts-expect-error control-plane index must not export wait consumer input types
type ControlPlaneIndexShouldNotExportWaitConsumerInput = import("../../src/control-plane/index.js").ExecutionSessionWaitConsumerInput;

// @ts-expect-error control-plane index must not export wait consumer readiness types
type ControlPlaneIndexShouldNotExportWaitConsumerReadiness = import("../../src/control-plane/index.js").ExecutionSessionWaitConsumerReadiness;

// @ts-expect-error control-plane index must not export wait consume results
type ControlPlaneIndexShouldNotExportWaitConsume = import("../../src/control-plane/index.js").ExecutionSessionWaitConsume;

// @ts-expect-error control-plane index must not export wait consume batch results
type ControlPlaneIndexShouldNotExportWaitConsumeBatch = import("../../src/control-plane/index.js").ExecutionSessionWaitConsumeBatch;

// @ts-expect-error control-plane index must not export wait target apply results
type ControlPlaneIndexShouldNotExportWaitTargetApply = import("../../src/control-plane/index.js").ExecutionSessionWaitTargetApply;

// @ts-expect-error control-plane index must not export wait target apply batch results
type ControlPlaneIndexShouldNotExportWaitTargetApplyBatch = import("../../src/control-plane/index.js").ExecutionSessionWaitTargetApplyBatch;

// @ts-expect-error control-plane index must not export close targets
type ControlPlaneIndexShouldNotExportCloseTarget = import("../../src/control-plane/index.js").ExecutionSessionCloseTarget;

// @ts-expect-error control-plane index must not export close apply results
type ControlPlaneIndexShouldNotExportCloseApply = import("../../src/control-plane/index.js").ExecutionSessionCloseApply;

// @ts-expect-error control-plane index must not export close apply input types
type ControlPlaneIndexShouldNotExportCloseApplyInput = import("../../src/control-plane/index.js").ExecutionSessionCloseApplyInput;

// @ts-expect-error control-plane index must not export close apply batch results
type ControlPlaneIndexShouldNotExportCloseApplyBatch = import("../../src/control-plane/index.js").ExecutionSessionCloseApplyBatch;

// @ts-expect-error control-plane index must not export close target apply results
type ControlPlaneIndexShouldNotExportCloseTargetApply = import("../../src/control-plane/index.js").ExecutionSessionCloseTargetApply;

// @ts-expect-error control-plane index must not export close target apply batch results
type ControlPlaneIndexShouldNotExportCloseTargetApplyBatch = import("../../src/control-plane/index.js").ExecutionSessionCloseTargetApplyBatch;

// @ts-expect-error control-plane index must not export close candidates
type ControlPlaneIndexShouldNotExportCloseCandidate = import("../../src/control-plane/index.js").ExecutionSessionCloseCandidate;

// @ts-expect-error control-plane index must not export close readiness types
type ControlPlaneIndexShouldNotExportCloseReadiness = import("../../src/control-plane/index.js").ExecutionSessionCloseReadiness;

// @ts-expect-error control-plane index must not export close target input types
type ControlPlaneIndexShouldNotExportCloseTargetInput = import("../../src/control-plane/index.js").ExecutionSessionCloseTargetInput;

// @ts-expect-error control-plane index must not export close requests
type ControlPlaneIndexShouldNotExportCloseRequest = import("../../src/control-plane/index.js").ExecutionSessionCloseRequest;

// @ts-expect-error control-plane index must not export close requested events
type ControlPlaneIndexShouldNotExportCloseRequestedEvent = import("../../src/control-plane/index.js").ExecutionSessionCloseRequestedEvent;

// @ts-expect-error control-plane index must not export close recorded events
type ControlPlaneIndexShouldNotExportCloseRecordedEvent = import("../../src/control-plane/index.js").ExecutionSessionCloseRecordedEvent;

// @ts-expect-error control-plane index must not export close consumers
type ControlPlaneIndexShouldNotExportCloseConsumer = import("../../src/control-plane/index.js").ExecutionSessionCloseConsumer;

// @ts-expect-error control-plane index must not export spawn request input types
type ControlPlaneIndexShouldNotExportExecutionSessionSpawnRequestInput = import("../../src/control-plane/index.js").ExecutionSessionSpawnRequestInput;

// @ts-expect-error control-plane index must not export spawn apply-batch input types
type ControlPlaneIndexShouldNotExportExecutionSessionSpawnApplyBatchInput = import("../../src/control-plane/index.js").ExecutionSessionSpawnApplyBatchInput;

// @ts-expect-error control-plane index must not export close consumer readiness types
type ControlPlaneIndexShouldNotExportCloseConsumerReadiness = import("../../src/control-plane/index.js").ExecutionSessionCloseConsumerReadiness;

// @ts-expect-error control-plane index must not export close consume results
type ControlPlaneIndexShouldNotExportCloseConsume = import("../../src/control-plane/index.js").ExecutionSessionCloseConsume;

// @ts-expect-error control-plane index must not export close consume batch results
type ControlPlaneIndexShouldNotExportCloseConsumeBatch = import("../../src/control-plane/index.js").ExecutionSessionCloseConsumeBatch;

// @ts-expect-error control-plane index must not export headless spawn inputs
type ControlPlaneIndexShouldNotExportSpawnHeadlessInput = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessInput;

// @ts-expect-error control-plane index must not export headless spawn input batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessInputBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessInputBatch;

// @ts-expect-error control-plane index must not export headless spawn apply results
type ControlPlaneIndexShouldNotExportSpawnHeadlessApply = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessApply;

// @ts-expect-error control-plane index must not export headless spawn apply batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessApplyBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessApplyBatch;

// @ts-expect-error control-plane index must not export headless spawn execute results
type ControlPlaneIndexShouldNotExportSpawnHeadlessExecute = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessExecute;

// @ts-expect-error control-plane index must not export headless spawn execution invoker types
type ControlPlaneIndexShouldNotExportSpawnHeadlessExecutionInvoker = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessExecutionInvoker;

// @ts-expect-error control-plane index must not export headless close candidates
type ControlPlaneIndexShouldNotExportSpawnHeadlessCloseCandidate = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessCloseCandidate;

// @ts-expect-error control-plane index must not export headless close request results
type ControlPlaneIndexShouldNotExportSpawnHeadlessCloseRequest = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessCloseRequest;

// @ts-expect-error control-plane index must not export headless close request batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessCloseRequestBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessCloseRequestBatch;

// @ts-expect-error control-plane index must not export shared headless wrapper guards
type ControlPlaneIndexShouldNotExportNormalizeHeadlessTargetWrapper = typeof import("../../src/control-plane/index.js").normalizeHeadlessTargetWrapper;

// @ts-expect-error control-plane index must not export shared headless batch wrapper guards
type ControlPlaneIndexShouldNotExportNormalizeHeadlessTargetBatchWrapper = typeof import("../../src/control-plane/index.js").normalizeHeadlessTargetBatchWrapper;

// @ts-expect-error control-plane index must not export headless close targets
type ControlPlaneIndexShouldNotExportSpawnHeadlessCloseTarget = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessCloseTarget;

// @ts-expect-error control-plane index must not export headless record results
type ControlPlaneIndexShouldNotExportSpawnHeadlessRecord = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessRecord;

// @ts-expect-error control-plane index must not export headless record batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessRecordBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessRecordBatch;

// @ts-expect-error control-plane index must not export headless view results
type ControlPlaneIndexShouldNotExportSpawnHeadlessView = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessView;

// @ts-expect-error control-plane index must not export headless view batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessViewBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessViewBatch;

// @ts-expect-error control-plane index must not export headless context results
type ControlPlaneIndexShouldNotExportSpawnHeadlessContext = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessContext;

// @ts-expect-error control-plane index must not export headless context batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessContextBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessContextBatch;

// @ts-expect-error control-plane index must not export headless wait candidate results
type ControlPlaneIndexShouldNotExportSpawnHeadlessWaitCandidate = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessWaitCandidate;

// @ts-expect-error control-plane index must not export headless wait candidate batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessWaitCandidateBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessWaitCandidateBatch;

// @ts-expect-error control-plane index must not export headless wait target results
type ControlPlaneIndexShouldNotExportSpawnHeadlessWaitTarget = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessWaitTarget;

// @ts-expect-error control-plane index must not export headless wait target batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessWaitTargetBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessWaitTargetBatch;

// @ts-expect-error control-plane index must not export headless wait target apply results
type ControlPlaneIndexShouldNotExportSpawnHeadlessWaitTargetApply = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessWaitTargetApply;

// @ts-expect-error control-plane index must not export headless wait target apply batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessWaitTargetApplyBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessWaitTargetApplyBatch;

// @ts-expect-error control-plane index must not export headless wait target apply-batch input types
type ControlPlaneIndexShouldNotExportSpawnHeadlessWaitTargetApplyBatchInput = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessWaitTargetApplyBatchInput;

// @ts-expect-error control-plane index must not export headless wait request results
type ControlPlaneIndexShouldNotExportSpawnHeadlessWaitRequest = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessWaitRequest;

// @ts-expect-error control-plane index must not export headless wait request batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessWaitRequestBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessWaitRequestBatch;

// @ts-expect-error control-plane index must not export headless close target apply results
type ControlPlaneIndexShouldNotExportSpawnHeadlessCloseTargetApply = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessCloseTargetApply;

// @ts-expect-error control-plane index must not export headless close target apply batch results
type ControlPlaneIndexShouldNotExportSpawnHeadlessCloseTargetApplyBatch = import("../../src/control-plane/index.js").ExecutionSessionSpawnHeadlessCloseTargetApplyBatch;

// @ts-expect-error control-plane index must not export spawn blocking vocabularies
type ControlPlaneIndexShouldNotExportSpawnBlockingReasons = typeof import("../../src/control-plane/index.js").executionSessionSpawnBlockingReasons;

// @ts-expect-error control-plane index must not export spawn budget helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionSpawnBudget = typeof import("../../src/control-plane/index.js").deriveExecutionSessionSpawnBudget;

// @ts-expect-error control-plane index must not export spawn batch plan helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionSpawnBatchPlan = typeof import("../../src/control-plane/index.js").deriveExecutionSessionSpawnBatchPlan;

// @ts-expect-error control-plane index must not export spawn batch item helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionSpawnBatchItems = typeof import("../../src/control-plane/index.js").deriveExecutionSessionSpawnBatchItems;

// @ts-expect-error control-plane index must not export spawn batch headless apply helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionSpawnBatchHeadlessApply = typeof import("../../src/control-plane/index.js").applyExecutionSessionSpawnBatchHeadlessApply;

// @ts-expect-error control-plane index must not export spawn batch item apply helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionSpawnBatchItems = typeof import("../../src/control-plane/index.js").applyExecutionSessionSpawnBatchItems;

// @ts-expect-error control-plane index must not export wait consumer blocking vocabularies
type ControlPlaneIndexShouldNotExportWaitConsumerBlockingReasons = typeof import("../../src/control-plane/index.js").executionSessionWaitConsumerBlockingReasons;

// @ts-expect-error control-plane index must not export close consumer blocking vocabularies
type ControlPlaneIndexShouldNotExportCloseConsumerBlockingReasons = typeof import("../../src/control-plane/index.js").executionSessionCloseConsumerBlockingReasons;

// @ts-expect-error control-plane index must not export wait invokers
type ControlPlaneIndexShouldNotExportWaitInvoker = import("../../src/control-plane/index.js").ExecutionSessionWaitInvoker;

// @ts-expect-error control-plane index must not export close invokers
type ControlPlaneIndexShouldNotExportCloseInvoker = import("../../src/control-plane/index.js").ExecutionSessionCloseInvoker;

// @ts-expect-error control-plane index must not export close request helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionCloseRequest = typeof import("../../src/control-plane/index.js").deriveExecutionSessionCloseRequest;

// @ts-expect-error control-plane index must not export wait request helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionWaitRequest = typeof import("../../src/control-plane/index.js").deriveExecutionSessionWaitRequest;

// @ts-expect-error control-plane index must not export execution-session index helpers
type ControlPlaneIndexShouldNotExportBuildExecutionSessionIndex = typeof import("../../src/control-plane/index.js").buildExecutionSessionIndex;

// @ts-expect-error control-plane index must not export execution-session context helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionContext = typeof import("../../src/control-plane/index.js").deriveExecutionSessionContext;

// @ts-expect-error control-plane index must not export execution-session vocabulary
type ControlPlaneIndexShouldNotExportExecutionSessionRecordSources = typeof import("../../src/control-plane/index.js").executionSessionRecordSources;

// @ts-expect-error control-plane index must not export close consumer helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionCloseConsumer = typeof import("../../src/control-plane/index.js").deriveExecutionSessionCloseConsumer;

// @ts-expect-error control-plane index must not export close apply helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionClose = typeof import("../../src/control-plane/index.js").applyExecutionSessionClose;

// @ts-expect-error control-plane index must not export spawn requested-event helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionSpawnRequestedEvent = typeof import("../../src/control-plane/index.js").deriveExecutionSessionSpawnRequestedEvent;

// @ts-expect-error control-plane index must not export spawn recorded-event helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionSpawnRecordedEvent = typeof import("../../src/control-plane/index.js").deriveExecutionSessionSpawnRecordedEvent;

// @ts-expect-error control-plane index must not export headless execute helpers
type ControlPlaneIndexShouldNotExportExecuteExecutionSessionSpawnHeadless = typeof import("../../src/control-plane/index.js").executeExecutionSessionSpawnHeadless;

// @ts-expect-error control-plane index must not export headless execute batch helpers
type ControlPlaneIndexShouldNotExportExecuteExecutionSessionSpawnHeadlessBatch = typeof import("../../src/control-plane/index.js").executeExecutionSessionSpawnHeadlessBatch;

// @ts-expect-error control-plane index must not export close apply batch helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionCloseBatch = typeof import("../../src/control-plane/index.js").applyExecutionSessionCloseBatch;

// @ts-expect-error control-plane index must not export close target apply helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionCloseTarget = typeof import("../../src/control-plane/index.js").applyExecutionSessionCloseTarget;

// @ts-expect-error control-plane index must not export wait target apply batch helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionWaitTargetBatch = typeof import("../../src/control-plane/index.js").applyExecutionSessionWaitTargetBatch;

// @ts-expect-error control-plane index must not export close target apply batch helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionCloseTargetBatch = typeof import("../../src/control-plane/index.js").applyExecutionSessionCloseTargetBatch;

// @ts-expect-error control-plane index must not export close consume batch helpers
type ControlPlaneIndexShouldNotExportConsumeExecutionSessionCloseBatch = typeof import("../../src/control-plane/index.js").consumeExecutionSessionCloseBatch;

// @ts-expect-error control-plane index must not export headless close target helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionSpawnHeadlessCloseTarget = typeof import("../../src/control-plane/index.js").deriveExecutionSessionSpawnHeadlessCloseTarget;

// @ts-expect-error control-plane index must not export headless wait target apply helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionSpawnHeadlessWaitTarget = typeof import("../../src/control-plane/index.js").applyExecutionSessionSpawnHeadlessWaitTarget;

// @ts-expect-error control-plane index must not export headless wait target apply batch helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionSpawnHeadlessWaitTargetBatch = typeof import("../../src/control-plane/index.js").applyExecutionSessionSpawnHeadlessWaitTargetBatch;

// @ts-expect-error control-plane index must not export headless wait request helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionSpawnHeadlessWaitRequest = typeof import("../../src/control-plane/index.js").deriveExecutionSessionSpawnHeadlessWaitRequest;

// @ts-expect-error control-plane index must not export headless wait request batch helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionSpawnHeadlessWaitRequestBatch = typeof import("../../src/control-plane/index.js").deriveExecutionSessionSpawnHeadlessWaitRequestBatch;

// @ts-expect-error control-plane index must not export headless close request helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionSpawnHeadlessCloseRequest = typeof import("../../src/control-plane/index.js").deriveExecutionSessionSpawnHeadlessCloseRequest;

// @ts-expect-error control-plane index must not export headless close request batch helpers
type ControlPlaneIndexShouldNotExportDeriveExecutionSessionSpawnHeadlessCloseRequestBatch = typeof import("../../src/control-plane/index.js").deriveExecutionSessionSpawnHeadlessCloseRequestBatch;

// @ts-expect-error control-plane index must not export headless close target apply helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionSpawnHeadlessCloseTarget = typeof import("../../src/control-plane/index.js").applyExecutionSessionSpawnHeadlessCloseTarget;

// @ts-expect-error control-plane index must not export headless close target apply batch helpers
type ControlPlaneIndexShouldNotExportApplyExecutionSessionSpawnHeadlessCloseTargetBatch = typeof import("../../src/control-plane/index.js").applyExecutionSessionSpawnHeadlessCloseTargetBatch;

// @ts-expect-error control-plane index must not export generic batch wrapper guards
type ControlPlaneIndexShouldNotExportNormalizeBatchWrapper = typeof import("../../src/control-plane/index.js").normalizeBatchWrapper;

// @ts-expect-error control-plane index must not export generic batch wrapper item guards
type ControlPlaneIndexShouldNotExportNormalizeBatchWrapperItems = typeof import("../../src/control-plane/index.js").normalizeBatchWrapperItems;
