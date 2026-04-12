import { ValidationError } from "../core/errors.js";
import {
  validateDownstreamIdentityIngress
} from "./downstream-identity-guardrails.js";
import {
  normalizeSelectionObjectArrayEntry,
  validateSelectionObjectInput,
  normalizeSelectionArrayProperty,
  normalizeSelectionOptionalFunctionProperty,
  normalizeSelectionRequiredFunctionProperty
} from "./entry-validation.js";
import { applyAttemptHandoffTarget } from "./handoff-target-apply.js";
import type {
  AttemptHandoffTargetApply,
  AttemptHandoffTargetApplyBatch,
  AttemptHandoffTargetApplyBatchInput
} from "./types.js";

export async function applyAttemptHandoffTargetBatch(
  input: AttemptHandoffTargetApplyBatchInput
): Promise<AttemptHandoffTargetApplyBatch> {
  validateSelectionObjectInput(
    input,
    "Attempt handoff target apply batch input must be an object."
  );
  const targets = normalizeSelectionArrayProperty(
    input,
    "targets",
    "Attempt handoff target apply batch requires targets to be an array."
  ) as AttemptHandoffTargetApplyBatchInput["targets"];
  const invokeHandoff = normalizeSelectionRequiredFunctionProperty(
    input,
    "invokeHandoff",
    "Attempt handoff target apply batch requires invokeHandoff to be a function."
  ) as AttemptHandoffTargetApplyBatchInput["invokeHandoff"];
  const resolveHandoffCapability = normalizeSelectionOptionalFunctionProperty(
    input,
    "resolveHandoffCapability",
    "Attempt handoff target apply batch requires resolveHandoffCapability to be a function when provided."
  ) as AttemptHandoffTargetApplyBatchInput["resolveHandoffCapability"];
  const normalizedTargets: AttemptHandoffTargetApplyBatchInput["targets"][number][] = [];

  for (let index = 0; index < targets.length; index += 1) {
    normalizedTargets.push(
      normalizeSelectionObjectArrayEntry<
        AttemptHandoffTargetApplyBatchInput["targets"][number]
      >(
        targets,
        index,
        "Attempt handoff target apply batch requires targets entries to be objects."
      )
    );
  }

  validateDownstreamIdentityIngress(normalizedTargets, {
    required:
      "Attempt handoff target apply batch requires targets entries to include non-empty taskId, attemptId, and runtime strings.",
    singleTask:
      "Attempt handoff target apply batch requires targets from a single taskId.",
    unique:
      "Attempt handoff target apply batch requires targets to use unique (taskId, attemptId, runtime) identities."
  });
  const results: AttemptHandoffTargetApply[] = [];

  for (let index = 0; index < normalizedTargets.length; index += 1) {
    const target = normalizedTargets[index]!;
    const result = await applyAttemptHandoffTarget({
      target,
      invokeHandoff,
      ...(resolveHandoffCapability === undefined
        ? {}
        : {
            resolveHandoffCapability
          })
    });

    if (result === undefined) {
      throw new ValidationError(
        "Attempt handoff target apply batch requires each target to produce a target-apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}
