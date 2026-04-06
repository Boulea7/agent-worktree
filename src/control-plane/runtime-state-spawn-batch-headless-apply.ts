import { applyExecutionSessionSpawnHeadlessInputBatch } from "./runtime-state-spawn-headless-apply-batch.js";
import type {
  ExecutionSessionSpawnBatchHeadlessApply,
  ExecutionSessionSpawnBatchHeadlessApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnBatchHeadlessApply(
  input: ExecutionSessionSpawnBatchHeadlessApplyInput
): Promise<ExecutionSessionSpawnBatchHeadlessApply> {
  const { headlessApplyItems } = input;

  if (headlessApplyItems.items === undefined) {
    return {
      headlessApplyItems
    };
  }

  const apply = await applyExecutionSessionSpawnHeadlessInputBatch({
    items: headlessApplyItems.items,
    invokeSpawn: input.invokeSpawn
  });

  return {
    headlessApplyItems,
    apply
  };
}
