import { ValidationError } from "../core/errors.js";
import {
  attemptSourceKinds,
  type AttemptSourceKind
} from "../manifest/types.js";

const validAttemptSourceKinds = new Set<AttemptSourceKind>(attemptSourceKinds);

export function normalizePromotionAttemptSourceKind(
  value: unknown,
  message: string
): AttemptSourceKind | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    !validAttemptSourceKinds.has(value as AttemptSourceKind)
  ) {
    throw new ValidationError(message);
  }

  return value as AttemptSourceKind;
}
