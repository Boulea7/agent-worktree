import type {
  HeadlessExecutionAttemptLineage,
  HeadlessExecutionObservation,
  HeadlessExecutionObservationUsage,
  HeadlessExecutionResult
} from "../adapters/types.js";
import {
  attemptSourceKinds,
  type AttemptSourceKind
} from "../manifest/types.js";

export const sessionNodeKinds = ["root", "child"] as const;

export const sessionSourceKinds = attemptSourceKinds;

export const sessionLifecycleStates = [
  "created",
  "active",
  "completed",
  "failed",
  "closed"
] as const;

export const sessionLifecycleEventKinds = [
  "spawn_requested",
  "spawn_recorded",
  "completion_observed",
  "close_requested",
  "close_recorded"
] as const;

export const executionSessionRecordSources = ["headless_result"] as const;
export const executionSessionWaitBlockingReasons = [
  "lifecycle_terminal",
  "session_unknown",
  "child_attempts_present"
] as const;
export const executionSessionWaitConsumerBlockingReasons = [
  "session_lifecycle_unsupported"
] as const;
export const executionSessionCloseBlockingReasons = [
  "session_lifecycle_unsupported",
  "lifecycle_terminal",
  "session_unknown",
  "child_attempts_present"
] as const;
export const executionSessionCloseConsumerBlockingReasons = [
  "session_lifecycle_unsupported"
] as const;
export const executionSessionSpawnBlockingReasons = [
  "lifecycle_terminal",
  "session_unknown",
  "lineage_depth_unknown",
  "depth_limit_reached",
  "child_limit_reached"
] as const;
export const executionSessionSpawnRequestSourceKinds = [
  "fork",
  "delegated"
] as const;

export type SessionNodeKind = (typeof sessionNodeKinds)[number];
export type SessionSourceKind = AttemptSourceKind;
export type SessionLifecycleState = (typeof sessionLifecycleStates)[number];
export type SessionLifecycleEventKind =
  (typeof sessionLifecycleEventKinds)[number];
export type ExecutionSessionRecordSource =
  (typeof executionSessionRecordSources)[number];
export type ExecutionSessionWaitBlockingReason =
  (typeof executionSessionWaitBlockingReasons)[number];
export type ExecutionSessionWaitConsumerBlockingReason =
  (typeof executionSessionWaitConsumerBlockingReasons)[number];
export type ExecutionSessionCloseBlockingReason =
  (typeof executionSessionCloseBlockingReasons)[number];
export type ExecutionSessionCloseConsumerBlockingReason =
  (typeof executionSessionCloseConsumerBlockingReasons)[number];
export type ExecutionSessionSpawnBlockingReason =
  (typeof executionSessionSpawnBlockingReasons)[number];
export type ExecutionSessionSpawnRequestSourceKind =
  (typeof executionSessionSpawnRequestSourceKinds)[number];

export interface SessionLifecycleCapabilityResolver {
  (runtime: string): boolean;
}

export interface SessionNodeRefInput {
  attemptId: string;
  parentAttemptId?: string;
  sourceKind?: SessionSourceKind;
}

export interface SessionLifecycleStateInput {
  lifecycleEventKind?: SessionLifecycleEventKind;
  observation?: HeadlessExecutionObservation;
}

export interface SessionGuardrails {
  maxChildren?: number;
  maxDepth?: number;
}

export interface SessionNodeRef {
  attemptId: string;
  nodeKind: SessionNodeKind;
  parentAttemptId?: string;
  sourceKind: SessionSourceKind;
}

export interface SessionRef {
  runtime: string;
  sessionId: string;
}

export interface SessionSnapshotInput extends SessionNodeRefInput {
  guardrails?: SessionGuardrails;
  lifecycleEventKind?: SessionLifecycleEventKind;
  observation?: HeadlessExecutionObservation;
  runtime: string;
}

export interface SessionSnapshot {
  errorEventCount: number;
  guardrails?: SessionGuardrails;
  lastAgentMessage?: string;
  lastErrorMessage?: string;
  lastLifecycleEventKind?: SessionLifecycleEventKind;
  lifecycleState: SessionLifecycleState;
  node: SessionNodeRef;
  runCompleted: boolean;
  sessionRef?: SessionRef;
  turnStatus?: string;
  usage?: HeadlessExecutionObservationUsage;
}

export interface SessionTreeIndex {
  byAttemptId: Map<string, SessionSnapshot>;
  childAttemptIdsByParent: Map<string, string[]>;
}

export interface ExecutionSessionRecordInput {
  attempt?: HeadlessExecutionAttemptLineage;
  result: HeadlessExecutionResult;
}

export interface ExecutionSessionRecord {
  attemptId: string;
  errorEventCount: number;
  guardrails?: SessionGuardrails;
  lastAgentMessage?: string;
  lastErrorMessage?: string;
  lifecycleState: SessionLifecycleState;
  origin: ExecutionSessionRecordSource;
  parentAttemptId?: string;
  runCompleted: boolean;
  runtime: string;
  sessionId?: string;
  sourceKind: SessionSourceKind;
  turnStatus?: string;
  usage?: HeadlessExecutionObservationUsage;
}

export interface ExecutionSessionIndex {
  byAttemptId: Map<string, ExecutionSessionRecord>;
  bySessionId: Map<string, ExecutionSessionRecord>;
}

export interface ExecutionSessionView {
  childAttemptIdsByParent: Map<string, string[]>;
  index: ExecutionSessionIndex;
}

export interface ExecutionSessionSelector {
  attemptId?: string;
  sessionId?: string;
}

export const executionSessionContextSelectionKinds = [
  "attemptId",
  "sessionId"
] as const;

export type ExecutionSessionContextSelectionKind =
  (typeof executionSessionContextSelectionKinds)[number];

export interface ExecutionSessionContextInput {
  selector: ExecutionSessionSelector;
  view: ExecutionSessionView;
}

export interface ExecutionSessionContext {
  childRecords: ExecutionSessionRecord[];
  hasChildren: boolean;
  hasKnownSession: boolean;
  hasParent: boolean;
  hasResolvedParent: boolean;
  parentRecord?: ExecutionSessionRecord;
  record: ExecutionSessionRecord;
  selectedBy: ExecutionSessionContextSelectionKind;
}

export interface ExecutionSessionLifecycleDispositionInput {
  context: ExecutionSessionContext;
}

export interface ExecutionSessionLifecycleDisposition {
  alreadyFinal: boolean;
  hasKnownSession: boolean;
  wouldAffectDescendants: boolean;
}

export interface ExecutionSessionWaitReadinessInput {
  context: ExecutionSessionContext;
}

export interface ExecutionSessionWaitReadiness {
  blockingReasons: ExecutionSessionWaitBlockingReason[];
  canWait: boolean;
  hasBlockingReasons: boolean;
}

export interface ExecutionSessionWaitCandidateInput {
  selector: ExecutionSessionSelector;
  view: ExecutionSessionView;
}

export interface ExecutionSessionWaitCandidate {
  context: ExecutionSessionContext;
  readiness: ExecutionSessionWaitReadiness;
}

export interface ExecutionSessionWaitTargetInput {
  candidate: ExecutionSessionWaitCandidate;
}

export interface ExecutionSessionWaitTarget {
  attemptId: string;
  runtime: string;
  sessionId: string;
}

export interface ExecutionSessionWaitRequestInput {
  target: ExecutionSessionWaitTarget;
  timeoutMs?: number;
}

export interface ExecutionSessionWaitRequest {
  attemptId: string;
  runtime: string;
  sessionId: string;
  timeoutMs?: number;
}

export interface ExecutionSessionWaitConsumerReadinessInput {
  request: ExecutionSessionWaitRequest;
  resolveSessionLifecycleCapability?: SessionLifecycleCapabilityResolver;
}

export interface ExecutionSessionWaitConsumerReadiness {
  blockingReasons: ExecutionSessionWaitConsumerBlockingReason[];
  canConsumeWait: boolean;
  hasBlockingReasons: boolean;
  sessionLifecycleSupported: boolean;
}

export interface ExecutionSessionWaitConsumerInput {
  request: ExecutionSessionWaitRequest;
  resolveSessionLifecycleCapability?: SessionLifecycleCapabilityResolver;
}

export interface ExecutionSessionWaitConsumer {
  readiness: ExecutionSessionWaitConsumerReadiness;
  request: ExecutionSessionWaitRequest;
}

export interface ExecutionSessionWaitInvoker {
  (request: ExecutionSessionWaitRequest): void | Promise<void>;
}

export interface ExecutionSessionWaitConsumeInput {
  consumer: ExecutionSessionWaitConsumer;
  invokeWait: ExecutionSessionWaitInvoker;
}

export interface ExecutionSessionWaitConsume {
  invoked: boolean;
  readiness: ExecutionSessionWaitConsumerReadiness;
  request: ExecutionSessionWaitRequest;
}

export interface ExecutionSessionWaitConsumeBatchInput {
  consumers: readonly ExecutionSessionWaitConsumer[];
  invokeWait: ExecutionSessionWaitInvoker;
}

export interface ExecutionSessionWaitConsumeBatch {
  results: ExecutionSessionWaitConsume[];
}

export interface ExecutionSessionCloseReadinessInput {
  context: ExecutionSessionContext;
  resolveSessionLifecycleCapability?: SessionLifecycleCapabilityResolver;
}

export interface ExecutionSessionCloseReadiness {
  alreadyFinal: boolean;
  blockingReasons: ExecutionSessionCloseBlockingReason[];
  canClose: boolean;
  hasBlockingReasons: boolean;
  sessionLifecycleSupported: boolean;
  wouldAffectDescendants: boolean;
}

export interface ExecutionSessionCloseCandidateInput {
  resolveSessionLifecycleCapability?: SessionLifecycleCapabilityResolver;
  selector: ExecutionSessionSelector;
  view: ExecutionSessionView;
}

export interface ExecutionSessionCloseCandidate {
  context: ExecutionSessionContext;
  readiness: ExecutionSessionCloseReadiness;
}

export interface ExecutionSessionCloseTargetInput {
  candidate: ExecutionSessionCloseCandidate;
}

export interface ExecutionSessionCloseTarget {
  attemptId: string;
  runtime: string;
  sessionId: string;
}

export interface ExecutionSessionCloseRequestInput {
  target: ExecutionSessionCloseTarget;
}

export interface ExecutionSessionCloseRequest {
  attemptId: string;
  runtime: string;
  sessionId: string;
}

export interface ExecutionSessionCloseConsumerReadinessInput {
  request: ExecutionSessionCloseRequest;
  resolveSessionLifecycleCapability?: SessionLifecycleCapabilityResolver;
}

export interface ExecutionSessionCloseConsumerReadiness {
  blockingReasons: ExecutionSessionCloseConsumerBlockingReason[];
  canConsumeClose: boolean;
  hasBlockingReasons: boolean;
  sessionLifecycleSupported: boolean;
}

export interface ExecutionSessionCloseConsumerInput {
  request: ExecutionSessionCloseRequest;
  resolveSessionLifecycleCapability?: SessionLifecycleCapabilityResolver;
}

export interface ExecutionSessionCloseConsumer {
  readiness: ExecutionSessionCloseConsumerReadiness;
  request: ExecutionSessionCloseRequest;
}

export interface ExecutionSessionCloseInvoker {
  (request: ExecutionSessionCloseRequest): void | Promise<void>;
}

export interface ExecutionSessionCloseConsumeInput {
  consumer: ExecutionSessionCloseConsumer;
  invokeClose: ExecutionSessionCloseInvoker;
}

export interface ExecutionSessionCloseConsume {
  invoked: boolean;
  readiness: ExecutionSessionCloseConsumerReadiness;
  request: ExecutionSessionCloseRequest;
}

export interface ExecutionSessionCloseConsumeBatchInput {
  consumers: readonly ExecutionSessionCloseConsumer[];
  invokeClose: ExecutionSessionCloseInvoker;
}

export interface ExecutionSessionCloseConsumeBatch {
  results: ExecutionSessionCloseConsume[];
}

export interface ExecutionSessionCloseRequestedEventInput {
  request: ExecutionSessionCloseRequest;
}

export interface ExecutionSessionCloseRequestedEvent {
  attemptId: string;
  lifecycleEventKind: "close_requested";
  runtime: string;
  sessionId: string;
}

export interface ExecutionSessionCloseRecordedEventInput {
  requestedEvent: ExecutionSessionCloseRequestedEvent;
}

export interface ExecutionSessionCloseRecordedEvent {
  attemptId: string;
  lifecycleEventKind: "close_recorded";
  runtime: string;
  sessionId: string;
}

export interface ExecutionSessionSpawnReadinessInput {
  context: ExecutionSessionContext;
  view: ExecutionSessionView;
}

export interface ExecutionSessionSpawnReadiness {
  blockingReasons: ExecutionSessionSpawnBlockingReason[];
  canSpawn: boolean;
  hasBlockingReasons: boolean;
  lineageDepth: number | undefined;
  lineageDepthKnown: boolean;
  withinChildLimit: boolean;
  withinDepthLimit: boolean;
}

export interface ExecutionSessionSpawnCandidateInput {
  selector: ExecutionSessionSelector;
  view: ExecutionSessionView;
}

export interface ExecutionSessionSpawnCandidate {
  context: ExecutionSessionContext;
  readiness: ExecutionSessionSpawnReadiness;
}

export interface ExecutionSessionSpawnTargetInput {
  candidate: ExecutionSessionSpawnCandidate;
}

export interface ExecutionSessionSpawnTarget {
  attemptId: string;
  runtime: string;
  sessionId: string;
}

export interface ExecutionSessionSpawnRequestInput {
  candidate: ExecutionSessionSpawnCandidate;
  sourceKind: ExecutionSessionSpawnRequestSourceKind;
}

export interface ExecutionSessionSpawnRequest {
  inheritedGuardrails?: SessionGuardrails;
  parentAttemptId: string;
  parentRuntime: string;
  parentSessionId: string;
  sourceKind: ExecutionSessionSpawnRequestSourceKind;
}

export interface ExecutionSessionSpawnInvoker {
  (request: ExecutionSessionSpawnRequest): void | Promise<void>;
}

export interface ExecutionSessionSpawnConsumeInput {
  invokeSpawn: ExecutionSessionSpawnInvoker;
  request: ExecutionSessionSpawnRequest;
}

export interface ExecutionSessionSpawnConsume {
  invoked: true;
  request: ExecutionSessionSpawnRequest;
}

export interface ExecutionSessionSpawnConsumeBatchInput {
  invokeSpawn: ExecutionSessionSpawnInvoker;
  requests: readonly ExecutionSessionSpawnRequest[];
}

export interface ExecutionSessionSpawnConsumeBatch {
  results: ExecutionSessionSpawnConsume[];
}

export interface ExecutionSessionSpawnRequestedEventInput {
  request: ExecutionSessionSpawnRequest;
}

export interface ExecutionSessionSpawnRequestedEvent {
  attemptId: string;
  lifecycleEventKind: "spawn_requested";
  runtime: string;
  sessionId: string;
}

export interface ExecutionSessionSpawnRecordedEventInput {
  requestedEvent: ExecutionSessionSpawnRequestedEvent;
}

export interface ExecutionSessionSpawnRecordedEvent {
  attemptId: string;
  lifecycleEventKind: "spawn_recorded";
  runtime: string;
  sessionId: string;
}

export interface ExecutionSessionSpawnLineageInput {
  childAttemptId: string;
  request: ExecutionSessionSpawnRequest;
}

export interface ExecutionSessionSpawnLineage {
  attemptId: string;
  guardrails?: SessionGuardrails;
  parentAttemptId: string;
  sourceKind: ExecutionSessionSpawnRequestSourceKind;
}
