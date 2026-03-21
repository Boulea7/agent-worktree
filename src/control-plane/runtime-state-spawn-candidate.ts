import { deriveExecutionSessionContext } from "./runtime-state-context.js";
import { deriveExecutionSessionSpawnReadiness } from "./runtime-state-spawn-readiness.js";
import type {
  ExecutionSessionSpawnCandidate,
  ExecutionSessionSpawnCandidateInput
} from "./types.js";

export function deriveExecutionSessionSpawnCandidate(
  input: ExecutionSessionSpawnCandidateInput
): ExecutionSessionSpawnCandidate | undefined {
  const context = deriveExecutionSessionContext({
    view: input.view,
    selector: input.selector
  });

  if (context === undefined) {
    return undefined;
  }

  return {
    context,
    readiness: deriveExecutionSessionSpawnReadiness({
      context,
      view: input.view
    })
  };
}
