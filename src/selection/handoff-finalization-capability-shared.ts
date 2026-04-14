import { ValidationError } from "../core/errors.js";

export function normalizeHandoffFinalizationCapability(
  value: unknown,
  context: string
): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(
      `${context} requires resolveHandoffFinalizationCapability to return a boolean.`
    );
  }

  return value;
}
