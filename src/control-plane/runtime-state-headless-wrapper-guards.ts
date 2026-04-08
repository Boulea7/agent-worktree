import { ValidationError } from "../core/errors.js";

export function normalizeHeadlessTargetWrapper<T>(
  value: T,
  options: {
    context: string;
    nestedKey: string;
    wrapperKey: string;
  }
): T {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !(options.nestedKey in value)
  ) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const nested = (value as Record<string, unknown>)[options.nestedKey];

  if (typeof nested !== "object" || nested === null || Array.isArray(nested)) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey}.${options.nestedKey} to be an object.`
    );
  }

  if (
    !("candidate" in nested) ||
    typeof nested.candidate !== "object" ||
    nested.candidate === null ||
    Array.isArray(nested.candidate) ||
    !("headlessContext" in nested) ||
    typeof nested.headlessContext !== "object" ||
    nested.headlessContext === null ||
    Array.isArray(nested.headlessContext)
  ) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey}.${options.nestedKey} to include candidate and headlessContext objects.`
    );
  }

  return value;
}

export function normalizeHeadlessTargetBatchWrapper<T>(
  value: T,
  options: {
    context: string;
    wrapperKey: string;
  }
): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const results = (value as Record<string, unknown>).results;

  if (!Array.isArray(results)) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey}.results to be an array.`
    );
  }

  return value;
}
