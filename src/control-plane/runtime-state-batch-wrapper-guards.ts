import { ValidationError } from "../core/errors.js";

export function normalizeBatchWrapper<Wrapper extends object>(
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

export function normalizeBatchWrapperObjectItems<Item extends object>(
  value: unknown,
  itemsMessage: string,
  entryMessage: string
): Item[] {
  const items = normalizeBatchWrapperItems<unknown>(value, itemsMessage);

  for (let index = 0; index < items.length; index += 1) {
    if (!hasOwnIndex(items, index) || !isRecord(items[index])) {
      throw new ValidationError(entryMessage);
    }
  }

  return items as Item[];
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
