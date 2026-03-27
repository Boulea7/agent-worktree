import { RuntimeError } from "../core/errors.js";
import type { CanonicalAdapterEvent } from "./types.js";

interface JsonLineRecord {
  [key: string]: unknown;
  type?: unknown;
}

const jsonArrayStartingTokens = new Set([
  "[",
  "]",
  "{",
  "\"",
  "-"
]);

const bracketNoisePrefixPatterns = [
  /^\d+\/\d+$/u,
  /^\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/u,
  /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/u
] as const;

export function splitJsonLines(output: string): string[] {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function parseCodexCliJsonl(output: string): CanonicalAdapterEvent[] {
  if (output.trim().length === 0) {
    return [];
  }

  return splitJsonLines(output).map((line, index) =>
    parseCodexCliJsonlLine(line, index)
  );
}

export const parseCodexJsonlEventStream = parseCodexCliJsonl;

export function normalizeCodexEvent(
  rawEvent: unknown,
  index: number
): CanonicalAdapterEvent {
  const rawType = getRawType(rawEvent);

  if (rawType === "item.completed" && isAgentMessageItem(rawEvent)) {
    return {
      index,
      kind: "message_completed",
      payload: getAgentMessageItem(rawEvent),
      rawType
    };
  }

  switch (rawType) {
    case "message_delta":
    case "item.delta":
      return {
        index,
        kind: "message_delta",
        payload: rawEvent,
        rawType
      };
    case "message_completed":
      return {
        index,
        kind: "message_completed",
        payload: rawEvent,
        rawType
      };
    case "run_completed":
    case "turn.completed":
      return {
        index,
        kind: "run_completed",
        payload: rawEvent,
        rawType
      };
    case "error":
      return {
        index,
        kind: "error",
        payload: rawEvent,
        rawType
      };
    default:
      return {
        index,
        kind: "unknown",
        payload: rawEvent,
        rawType
      };
  }
}

export function parseCodexCliJsonlLine(
  line: string,
  index: number
): CanonicalAdapterEvent {
  if (!isPotentialJsonLine(line)) {
    return {
      index,
      kind: "unknown",
      payload: {
        line
      },
      rawType: "non_json_output"
    };
  }

  return normalizeCodexEvent(parseJsonLineRecord(line, index), index);
}

function parseJsonLineRecord(line: string, index: number): JsonLineRecord {
  try {
    return JSON.parse(line) as JsonLineRecord;
  } catch (error) {
    throw new RuntimeError(
      `Failed to parse Codex JSONL line at index ${index}.`,
      error
    );
  }
}

function isPotentialJsonLine(line: string): boolean {
  if (line.startsWith("{")) {
    return true;
  }

  if (!line.startsWith("[")) {
    return false;
  }

  if (startsWithBracketPrefixedEventPayload(line)) {
    return true;
  }

  if (startsWithBracketNoisePrefix(line)) {
    return false;
  }

  const firstToken = line.slice(1).trimStart().at(0);

  if (firstToken === undefined) {
    return true;
  }

  return (
    jsonArrayStartingTokens.has(firstToken) ||
    isDigit(firstToken) ||
    startsWithJsonLiteral(line)
  );
}

function getRawType(rawEvent: unknown): string {
  if (
    typeof rawEvent === "object" &&
    rawEvent !== null &&
    "type" in rawEvent &&
    typeof rawEvent.type === "string"
  ) {
    return rawEvent.type;
  }

  return "unknown";
}

function isAgentMessageItem(rawEvent: unknown): boolean {
  if (typeof rawEvent !== "object" || rawEvent === null || !("item" in rawEvent)) {
    return false;
  }

  const item = rawEvent.item;
  return (
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    item.type === "agent_message"
  );
}

function getAgentMessageItem(rawEvent: unknown): JsonLineRecord {
  if (
    typeof rawEvent === "object" &&
    rawEvent !== null &&
    "item" in rawEvent &&
    typeof rawEvent.item === "object" &&
    rawEvent.item !== null
  ) {
    return rawEvent.item as JsonLineRecord;
  }

  return {};
}

function isDigit(value: string): boolean {
  return value >= "0" && value <= "9";
}

function startsWithJsonLiteral(line: string): boolean {
  const trimmedArrayContents = line.slice(1).trimStart();

  return (
    trimmedArrayContents.startsWith("true") ||
    trimmedArrayContents.startsWith("false") ||
    trimmedArrayContents.startsWith("null")
  );
}

function startsWithBracketNoisePrefix(line: string): boolean {
  const closingBracketIndex = line.indexOf("]");

  if (closingBracketIndex <= 1) {
    return false;
  }

  const bracketContent = line.slice(1, closingBracketIndex).trim();
  const trailingText = line.slice(closingBracketIndex + 1).trimStart();

  if (
    !bracketNoisePrefixPatterns.some((pattern) => pattern.test(bracketContent))
  ) {
    return false;
  }

  if (trailingText.length === 0) {
    return true;
  }

  return !startsWithPotentialJsonValue(trailingText);
}

function startsWithBracketPrefixedEventPayload(line: string): boolean {
  const closingBracketIndex = line.indexOf("]");

  if (closingBracketIndex <= 1) {
    return false;
  }

  const trailingText = line.slice(closingBracketIndex + 1).trimStart();

  if (!trailingText.startsWith("{")) {
    return false;
  }

  try {
    const parsedValue = JSON.parse(trailingText) as JsonLineRecord;
    return typeof parsedValue.type === "string";
  } catch {
    return /^\{\s*"type"\s*:/u.test(trailingText);
  }
}

function startsWithPotentialJsonValue(value: string): boolean {
  const firstToken = value.at(0);

  if (firstToken === undefined) {
    return false;
  }

  return (
    jsonArrayStartingTokens.has(firstToken) ||
    isDigit(firstToken) ||
    startsWithJsonLiteral(`[${value}`)
  );
}
