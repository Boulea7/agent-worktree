import { consumeAttemptHandoffFinalization } from "./handoff-finalization-consume.js";
import type {
  AttemptHandoffFinalizationConsume,
  AttemptHandoffFinalizationConsumeBatch,
  AttemptHandoffFinalizationConsumeBatchInput
} from "./types.js";

export async function consumeAttemptHandoffFinalizationBatch(
  input: AttemptHandoffFinalizationConsumeBatchInput
): Promise<AttemptHandoffFinalizationConsumeBatch> {
  const { consumers, invokeHandoffFinalization } = input;
  const results: AttemptHandoffFinalizationConsume[] = [];

  for (const consumer of consumers) {
    results.push(
      await consumeAttemptHandoffFinalization({
        consumer,
        invokeHandoffFinalization
      })
    );
  }

  return {
    results
  };
}
