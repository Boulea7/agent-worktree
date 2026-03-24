import { deriveExecutionSessionSpawnHeadlessInput } from "./runtime-state-spawn-headless-input.js";
import type {
  ExecutionSessionSpawnHeadlessInput,
  ExecutionSessionSpawnHeadlessInputBatch,
  ExecutionSessionSpawnHeadlessInputBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnHeadlessInputBatch(
  input: ExecutionSessionSpawnHeadlessInputBatchInput
): ExecutionSessionSpawnHeadlessInputBatch {
  const results: ExecutionSessionSpawnHeadlessInput[] = [];

  for (const item of input.items) {
    results.push(deriveExecutionSessionSpawnHeadlessInput(item));
  }

  return {
    results
  };
}
