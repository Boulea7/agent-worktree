import { ValidationError } from "../core/errors.js";

function deriveNestedWrapperPath(
  wrapperKey: string,
  nestedKey: string
): string {
  return wrapperKey === nestedKey ? wrapperKey : `${wrapperKey}.${nestedKey}`;
}

function hasOwnProperty(
  value: Record<string, unknown>,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function readOwnProperty(
  value: Record<string, unknown>,
  key: string,
  message: string
): unknown {
  if (!hasOwnProperty(value, key)) {
    throw new ValidationError(message);
  }

  try {
    return value[key];
  } catch {
    throw new ValidationError(message);
  }
}

function readOwnObjectProperty(
  value: Record<string, unknown>,
  key: string,
  message: string
): Record<string, unknown> {
  const property = readOwnProperty(value, key, message);

  if (
    typeof property !== "object" ||
    property === null ||
    Array.isArray(property)
  ) {
    throw new ValidationError(message);
  }

  return property as Record<string, unknown>;
}

function readOwnArrayProperty(
  value: Record<string, unknown>,
  key: string,
  message: string
): readonly unknown[] {
  const property = readOwnProperty(value, key, message);

  if (!Array.isArray(property)) {
    throw new ValidationError(message);
  }

  return property;
}

export function normalizeHeadlessContextWrapper<T>(
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

  const wrapper = value as Record<string, unknown>;
  const headlessContext = readOwnObjectProperty(
    wrapper,
    options.wrapperKey,
    `${options.context} requires a ${options.wrapperKey} wrapper.`
  );
  const entryMessage = `${options.context} requires ${options.wrapperKey} to include context and headlessView objects.`;
  readOwnObjectProperty(headlessContext, "context", entryMessage);
  readOwnObjectProperty(headlessContext, "headlessView", entryMessage);

  return value;
}

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
    !hasOwnProperty(value as Record<string, unknown>, options.nestedKey)
  ) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const nested = readOwnProperty(
    value as Record<string, unknown>,
    options.nestedKey,
    `${options.context} requires a ${options.wrapperKey} wrapper.`
  );
  const nestedPath = deriveNestedWrapperPath(
    options.wrapperKey,
    options.nestedKey
  );

  if (typeof nested !== "object" || nested === null || Array.isArray(nested)) {
    throw new ValidationError(
      `${options.context} requires ${nestedPath} to be an object.`
    );
  }

  const nestedMessage = `${options.context} requires ${nestedPath} to include candidate and headlessContext objects.`;
  readOwnObjectProperty(nested as Record<string, unknown>, "candidate", nestedMessage);
  const headlessContext = readOwnObjectProperty(
    nested as Record<string, unknown>,
    "headlessContext",
    nestedMessage
  );
  const headlessContextMessage = `${options.context} requires ${nestedPath}.headlessContext to include context and headlessView objects.`;
  readOwnObjectProperty(headlessContext, "context", headlessContextMessage);
  readOwnObjectProperty(headlessContext, "headlessView", headlessContextMessage);

  return value;
}

export function normalizeHeadlessTargetBatchWrapper<T>(
  value: T,
  options: {
    context: string;
    companionKey?: string;
    wrapperKey: string;
  }
): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(
      `${options.context} requires a ${options.wrapperKey} wrapper.`
    );
  }

  const results = readOwnProperty(
    value as Record<string, unknown>,
    "results",
    `${options.context} requires ${options.wrapperKey}.results to be an array.`
  );

  if (!Array.isArray(results)) {
    throw new ValidationError(
      `${options.context} requires ${options.wrapperKey}.results to be an array.`
    );
  }

  if (options.companionKey !== undefined) {
    validateBatchCompanion(value, options);
  }

  return value;
}

function validateBatchCompanion(
  value: unknown,
  options: {
    context: string;
    companionKey?: string;
    wrapperKey: string;
  }
): void {
  const wrapper = value as Record<string, unknown>;
  const companionKey = options.companionKey;

  if (companionKey === undefined) {
    return;
  }

  const companionMessage = `${options.context} requires ${options.wrapperKey} to include a valid ${companionKey} companion wrapper.`;
  const companion = readOwnObjectProperty(wrapper, companionKey, companionMessage);

  if (companionKey === "headlessContextBatch") {
    normalizeHeadlessContextBatchWrapper(companion, {
      context: options.context,
      wrapperKey: companionKey
    });
    return;
  }

  if (
    companionKey === "headlessWaitCandidateBatch" ||
    companionKey === "headlessCloseCandidateBatch"
  ) {
    normalizeHeadlessTargetBatchWrapper(companion, {
      context: options.context,
      wrapperKey: companionKey,
      companionKey: "headlessContextBatch"
    });
  }
}

export function normalizeHeadlessViewBatchWrapper<T>(
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

  const wrapper = value as Record<string, unknown>;
  const wrapperMessage = `${options.context} requires ${options.wrapperKey} to include headlessRecordBatch and view objects.`;
  const headlessRecordBatch = readOwnObjectProperty(
    wrapper,
    "headlessRecordBatch",
    wrapperMessage
  );
  readOwnObjectProperty(wrapper, "view", wrapperMessage);
  readOwnArrayProperty(
    headlessRecordBatch,
    "results",
    `${options.context} requires ${options.wrapperKey}.headlessRecordBatch.results to be an array.`
  );

  return value;
}

export function normalizeHeadlessContextBatchWrapper<T>(
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

  const wrapper = value as Record<string, unknown>;
  const wrapperMessage = `${options.context} requires ${options.wrapperKey} to include headlessViewBatch and results.`;
  const headlessViewBatch = readOwnObjectProperty(
    wrapper,
    "headlessViewBatch",
    wrapperMessage
  );
  readOwnArrayProperty(wrapper, "results", wrapperMessage);
  const headlessRecordBatch = readOwnObjectProperty(
    headlessViewBatch,
    "headlessRecordBatch",
    `${options.context} requires ${options.wrapperKey}.headlessViewBatch.headlessRecordBatch.results to be an array.`
  );
  readOwnObjectProperty(
    headlessViewBatch,
    "view",
    `${options.context} requires ${options.wrapperKey}.headlessViewBatch.headlessRecordBatch.results to be an array.`
  );
  readOwnArrayProperty(
    headlessRecordBatch,
    "results",
    `${options.context} requires ${options.wrapperKey}.headlessViewBatch.headlessRecordBatch.results to be an array.`
  );

  return value;
}
