import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { RuntimeError } from "../../src/core/errors.js";
import {
  parseCodexCliJsonl,
  parseCodexCliJsonlLine
} from "../../src/adapters/codex-cli-parser.js";

async function readFixture(name: string): Promise<string> {
  return readFile(
    new URL(`../fixtures/adapters/codex-cli/headless/${name}`, import.meta.url),
    "utf8"
  );
}

async function readExpected(name: string): Promise<{ events: unknown[] }> {
  const file = await readFixture(name);
  return JSON.parse(file) as { events: unknown[] };
}

const normalizationFixtures = [
  {
    name: "success output",
    input: "success.observed.jsonl",
    expected: "success.observed.expected.json"
  },
  {
    name: "unknown event output",
    input: "unknown-event.jsonl",
    expected: "unknown-event.expected.json"
  },
  {
    name: "truncated output",
    input: "truncated-stream.jsonl",
    expected: "truncated-stream.expected.json"
  },
  {
    name: "error output",
    input: "error-event.jsonl",
    expected: "error-event.expected.json"
  },
  {
    name: "item delta output",
    input: "item-delta.jsonl",
    expected: "item-delta.expected.json"
  },
  {
    name: "noisy prelude output",
    input: "noisy-prelude.jsonl",
    expected: "noisy-prelude.expected.json"
  },
  {
    name: "bracket noise output",
    input: "bracket-noise.jsonl",
    expected: "bracket-noise.expected.json"
  },
  {
    name: "array line output",
    input: "legal-array-event.jsonl",
    expected: "legal-array-event.expected.json"
  }
] as const;

describe("parseCodexCliJsonl", () => {
  it.each(normalizationFixtures)(
    "should normalize $name into canonical events",
    async ({ input, expected }) => {
      const fixture = await readFixture(input);
      const expectedPayload = await readExpected(expected);

      expect(parseCodexCliJsonl(fixture)).toEqual(expectedPayload.events);
    }
  );

  it("should fail loudly on invalid json lines", async () => {
    const fixture = await readFixture("invalid-json-line.jsonl");

    expect(() => parseCodexCliJsonl(fixture)).toThrow(RuntimeError);
  });

  it("should fail loudly on malformed bracket-prefixed json-looking lines", async () => {
    const fixture = await readFixture("invalid-bracket-line.jsonl");

    expect(() => parseCodexCliJsonl(fixture)).toThrow(RuntimeError);
  });
});

describe("parseCodexCliJsonlLine", () => {
  it("should normalize agent message completion events from observed output", () => {
    expect(
      parseCodexCliJsonlLine(
        JSON.stringify({
          type: "item.completed",
          item: {
            id: "item_0",
            type: "agent_message",
            text: "ok"
          }
        }),
        2
      )
    ).toEqual({
      kind: "message_completed",
      rawType: "item.completed",
      payload: {
        id: "item_0",
        type: "agent_message",
        text: "ok"
      },
      index: 2
    });
  });

  it("should normalize item delta events from observed output", () => {
    expect(
      parseCodexCliJsonlLine(
        JSON.stringify({
          type: "item.delta",
          delta: {
            text: "o"
          }
        }),
        3
      )
    ).toEqual({
      kind: "message_delta",
      rawType: "item.delta",
      payload: {
        type: "item.delta",
        delta: {
          text: "o"
        }
      },
      index: 3
    });
  });

  it("should normalize error events from observed output", () => {
    expect(
      parseCodexCliJsonlLine(
        JSON.stringify({
          type: "error",
          message: "codex failed"
        }),
        4
      )
    ).toEqual({
      kind: "error",
      rawType: "error",
      payload: {
        type: "error",
        message: "codex failed"
      },
      index: 4
    });
  });

  it("should normalize bracket-prefixed log noise as non-json output", () => {
    expect(parseCodexCliJsonlLine("[warn] codex prelude", 0)).toEqual({
      kind: "unknown",
      rawType: "non_json_output",
      payload: {
        line: "[warn] codex prelude"
      },
      index: 0
    });
  });

  it.each([
    "[2026-03-27T10:15:12Z] codex prelude",
    "[1/3] Retrying request",
    "[1/3]",
    "[12:34:56]"
  ])(
    "should normalize bracket-prefixed timestamp or progress noise as non-json output",
    (line) => {
      expect(parseCodexCliJsonlLine(line, 1)).toEqual({
        kind: "unknown",
        rawType: "non_json_output",
        payload: {
          line
        },
        index: 1
      });
    }
  );

  it.each([
    {
      line: "[1]",
      payload: [1]
    },
    {
      line: "[true]",
      payload: [true]
    },
    {
      line: "[null]",
      payload: [null]
    },
    {
      line: '[{"message":"array payload"}]',
      payload: [
        {
          message: "array payload"
        }
      ]
    }
  ])("should preserve legal bracket-prefixed json values as unknown events", ({ line, payload }) => {
    expect(parseCodexCliJsonlLine(line, 1)).toEqual({
      kind: "unknown",
      rawType: "unknown",
      payload,
      index: 1
    });
  });

  it("should fail loudly on malformed bracket-prefixed json-looking lines", () => {
    expect(() => parseCodexCliJsonlLine("[1,]", 2)).toThrow(RuntimeError);
  });

  it("should fail loudly when bracket noise prefixes are followed by a json payload", () => {
    expect(() =>
      parseCodexCliJsonlLine(
        '[2026-03-27T10:15:12Z] {"type":"turn.completed"}',
        3
      )
    ).toThrow(RuntimeError);
  });
});
