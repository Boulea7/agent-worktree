import { ValidationError } from "../core/errors.js";

export function validateSelectionObjectInput(
  value: unknown,
  message: string
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ValidationError(message);
  }
}

export function validateSelectionRequiredFunction(
  value: unknown,
  message: string
): void {
  if (typeof value !== "function") {
    throw new ValidationError(message);
  }
}

export function validateSelectionOptionalFunction(
  value: unknown,
  message: string
): void {
  if (value !== undefined && typeof value !== "function") {
    throw new ValidationError(message);
  }
}

export function validateSelectionArray(
  value: unknown,
  message: string
): asserts value is readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(message);
  }
}

export function validateSelectionObjectArrayEntries(
  values: readonly unknown[],
  message: string
): void {
  for (let index = 0; index < values.length; index += 1) {
    validateSelectionObjectArrayEntry(values, index, message);
  }
}

export function validateSelectionObjectArrayEntry(
  values: readonly unknown[],
  index: number,
  message: string
): void {
  if (!hasOwnIndex(values, index) || !isRecord(values[index])) {
    throw new ValidationError(message);
  }
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
