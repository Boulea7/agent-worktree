import { ValidationError } from "../core/errors.js";

export function validateSelectionObjectInput(
  value: unknown,
  message: string
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ValidationError(message);
  }
}

export function readSelectionValue(
  container: Record<string, unknown>,
  key: string,
  message: string
): unknown {
  try {
    return container[key];
  } catch {
    throw new ValidationError(message);
  }
}

export function normalizeSelectionArrayProperty(
  container: Record<string, unknown>,
  key: string,
  message: string
): readonly unknown[] {
  const value = readSelectionValue(container, key, message);
  validateSelectionArray(value, message);
  return value;
}

export function normalizeSelectionRequiredFunctionProperty(
  container: Record<string, unknown>,
  key: string,
  message: string
): (...args: never[]) => unknown {
  const value = readSelectionValue(container, key, message);
  validateSelectionRequiredFunction(value, message);
  return value as (...args: never[]) => unknown;
}

export function normalizeSelectionOptionalFunctionProperty(
  container: Record<string, unknown>,
  key: string,
  message: string
): ((...args: never[]) => unknown) | undefined {
  const value = readSelectionValue(container, key, message);
  validateSelectionOptionalFunction(value, message);
  return value as ((...args: never[]) => unknown) | undefined;
}

export function rethrowSelectionAccessError(
  error: unknown,
  message: string
): never {
  if (error instanceof ValidationError) {
    throw error;
  }

  throw new ValidationError(message);
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
  normalizeSelectionObjectArrayEntry(values, index, message);
}

export function normalizeSelectionObjectArrayEntry<T>(
  values: readonly unknown[],
  index: number,
  message: string
): T {
  if (!hasOwnIndex(values, index)) {
    throw new ValidationError(message);
  }

  let value: unknown;

  try {
    value = values[index];
  } catch {
    throw new ValidationError(message);
  }

  if (!isRecord(value)) {
    throw new ValidationError(message);
  }

  return value as T;
}

function hasOwnIndex(values: readonly unknown[], index: number): boolean {
  return Object.prototype.hasOwnProperty.call(values, index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
