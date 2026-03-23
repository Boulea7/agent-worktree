import { deriveExecutionSessionSpawnEffects } from "./runtime-state-spawn-effects.js";
import type {
  ExecutionSessionSpawnEffects,
  ExecutionSessionSpawnEffectsBatch,
  ExecutionSessionSpawnEffectsBatchInput
} from "./types.js";

export function deriveExecutionSessionSpawnEffectsBatch(
  input: ExecutionSessionSpawnEffectsBatchInput
): ExecutionSessionSpawnEffectsBatch {
  const results: ExecutionSessionSpawnEffects[] = [];

  for (const item of input.items) {
    results.push(deriveExecutionSessionSpawnEffects(item));
  }

  return {
    results
  };
}
