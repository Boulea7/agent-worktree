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
import { applyAttemptPromotionTarget } from "./promotion-target-apply.js";
import type {
  AttemptPromotionTargetApply,
  AttemptPromotionTargetApplyBatch,
  AttemptPromotionTargetApplyBatchInput
} from "./types.js";

export async function applyAttemptPromotionTargetBatch(
  input: AttemptPromotionTargetApplyBatchInput
): Promise<AttemptPromotionTargetApplyBatch> {
  validateSelectionObjectInput(
    input,
    "Attempt promotion target apply batch input must be an object."
  );
  const targets = normalizeSelectionArrayProperty(
    input,
    "targets",
    "Attempt promotion target apply batch requires targets to be an array."
  ) as AttemptPromotionTargetApplyBatchInput["targets"];
  const invokeHandoff = normalizeSelectionRequiredFunctionProperty(
    input,
    "invokeHandoff",
    "Attempt promotion target apply batch requires invokeHandoff to be a function."
  ) as AttemptPromotionTargetApplyBatchInput["invokeHandoff"];
  const resolveHandoffCapability = normalizeSelectionOptionalFunctionProperty(
    input,
    "resolveHandoffCapability",
    "Attempt promotion target apply batch requires resolveHandoffCapability to be a function when provided."
  ) as AttemptPromotionTargetApplyBatchInput["resolveHandoffCapability"];
  const normalizedTargets: AttemptPromotionTargetApplyBatchInput["targets"][number][] = [];

  for (let index = 0; index < targets.length; index += 1) {
    normalizedTargets.push(
      normalizeSelectionObjectArrayEntry<
        AttemptPromotionTargetApplyBatchInput["targets"][number]
      >(
        targets,
        index,
        "Attempt promotion target apply batch requires targets entries to be objects."
      )
    );
  }

  validateDownstreamIdentityIngress(normalizedTargets, {
    required:
      "Attempt promotion target apply batch requires targets entries to include non-empty taskId, attemptId, and runtime strings.",
    singleTask:
      "Attempt promotion target apply batch requires targets from a single taskId.",
    unique:
      "Attempt promotion target apply batch requires targets to use unique (taskId, attemptId, runtime) identities."
  });
  const results: AttemptPromotionTargetApply[] = [];

  for (let index = 0; index < normalizedTargets.length; index += 1) {
    const target = normalizedTargets[index]!;
    const result = await applyAttemptPromotionTarget({
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
        "Attempt promotion target apply batch requires each target to produce a promotion target-apply result."
      );
    }

    results.push(result);
  }

  return {
    results
  };
}
