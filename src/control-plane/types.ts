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
export const executionSessionCloseBlockingReasons = [
  "session_lifecycle_unsupported",
  "lifecycle_terminal",
  "session_unknown",
  "child_attempts_present"
] as const;
export const executionSessionSpawnBlockingReasons = [
  "lifecycle_terminal",
  "session_unknown",
  "lineage_depth_unknown",
  "depth_limit_reached",
  "child_limit_reached"
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
export type ExecutionSessionCloseBlockingReason =
  (typeof executionSessionCloseBlockingReasons)[number];
export type ExecutionSessionSpawnBlockingReason =
  (typeof executionSessionSpawnBlockingReasons)[number];

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
