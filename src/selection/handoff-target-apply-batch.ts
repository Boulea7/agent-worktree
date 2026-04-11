import { ValidationError } from "../core/errors.js";
import {
  validateDownstreamIdentityIngress
} from "./downstream-identity-guardrails.js";
import {
  validateSelectionArray,
  validateSelectionObjectArrayEntry,
  validateSelectionObjectInput,
  validateSelectionOptionalFunction,
  validateSelectionRequiredFunction
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
  validateSelectionArray(
    input.targets,
    "Attempt handoff target apply batch requires targets to be an array."
  );
  validateSelectionRequiredFunction(
    input.invokeHandoff,
    "Attempt handoff target apply batch requires invokeHandoff to be a function."
  );
  validateSelectionOptionalFunction(
    input.resolveHandoffCapability,
    "Attempt handoff target apply batch requires resolveHandoffCapability to be a function when provided."
  );

  for (let index = 0; index < input.targets.length; index += 1) {
    validateSelectionObjectArrayEntry(
      input.targets,
      index,
      "Attempt handoff target apply batch requires targets entries to be objects."
    );
  }

  validateDownstreamIdentityIngress(input.targets, {
    required:
      "Attempt handoff target apply batch requires targets entries to include non-empty taskId, attemptId, and runtime strings.",
    singleTask:
      "Attempt handoff target apply batch requires targets from a single taskId.",
    unique:
      "Attempt handoff target apply batch requires targets to use unique (taskId, attemptId, runtime) identities."
  });
  const results: AttemptHandoffTargetApply[] = [];

  for (let index = 0; index < input.targets.length; index += 1) {
    const target = input.targets[index]!;
    const result = await applyAttemptHandoffTarget({
      target,
      invokeHandoff: input.invokeHandoff,
      ...(input.resolveHandoffCapability === undefined
        ? {}
        : {
            resolveHandoffCapability: input.resolveHandoffCapability
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
