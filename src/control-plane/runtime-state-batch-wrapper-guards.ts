import { ValidationError } from "../core/errors.js";

export function normalizeBatchWrapper<Wrapper extends Record<string, unknown>>(
  value: unknown,
  inputMessage: string
): Wrapper {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(inputMessage);
  }

  return value as Wrapper;
}

export function normalizeBatchWrapperItems<Item>(
  value: unknown,
  itemsMessage: string
): Item[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(itemsMessage);
  }

  return value as Item[];
}
