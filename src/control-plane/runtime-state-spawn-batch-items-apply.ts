import { applyExecutionSessionSpawnBatch } from "./runtime-state-spawn-apply-batch.js";
import type {
  ExecutionSessionSpawnBatchItemsApply,
  ExecutionSessionSpawnBatchItemsApplyInput
} from "./types.js";

export async function applyExecutionSessionSpawnBatchItems(
  input: ExecutionSessionSpawnBatchItemsApplyInput
): Promise<ExecutionSessionSpawnBatchItemsApply> {
  const { batchItems } = input;

  if (batchItems.items === undefined) {
    return {
      batchItems
    };
  }

  const apply = await applyExecutionSessionSpawnBatch({
    items: batchItems.items,
    invokeSpawn: input.invokeSpawn
  });

  return {
    batchItems,
    apply
  };
}
