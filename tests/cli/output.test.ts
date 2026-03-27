import { describe, expect, it } from "vitest";

import {
  formatHumanError,
  writeError,
  writeSuccess
} from "../../src/cli/output.js";
import {
  NotFoundError,
  ValidationError
} from "../../src/core/errors.js";

class MemoryWriter {
  public output = "";

  public write(chunk: string): void {
    this.output += chunk;
  }
}

describe("cli output helpers", () => {
  it("should write success envelopes as formatted json with a trailing newline", () => {
    const writer = new MemoryWriter();

    writeSuccess(writer, "compat.list", {
      tools: [{ tool: "codex-cli" }]
    });

    expect(writer.output.endsWith("\n")).toBe(true);
    expect(writer.output.endsWith("\n\n")).toBe(false);
    expect(JSON.parse(writer.output)).toEqual({
      ok: true,
      command: "compat.list",
      data: {
        tools: [{ tool: "codex-cli" }]
      }
    });
  });

  it("should preserve agent error codes in machine-readable error envelopes", () => {
    const writer = new MemoryWriter();

    writeError(writer, "attempt.create", new ValidationError("bad input"));

    expect(writer.output.endsWith("\n")).toBe(true);
    expect(writer.output.endsWith("\n\n")).toBe(false);
    const payload = JSON.parse(writer.output) as {
      command: string;
      error: Record<string, unknown>;
      ok: boolean;
    };
    expect(payload).toEqual({
      ok: false,
      command: "attempt.create",
      error: {
        code: "VALIDATION_ERROR",
        message: "bad input"
      }
    });
    expect(Object.keys(payload).sort()).toEqual(["command", "error", "ok"]);
    expect(Object.keys(payload.error).sort()).toEqual(["code", "message"]);
    expect(payload.error).not.toHaveProperty("name");
    expect(payload.error).not.toHaveProperty("causeValue");
    expect(payload.error).not.toHaveProperty("stack");
  });

  it("should normalize plain errors to runtime errors", () => {
    const writer = new MemoryWriter();

    writeError(writer, "compat.probe", new Error("boom"));

    expect(JSON.parse(writer.output)).toEqual({
      ok: false,
      command: "compat.probe",
      error: {
        code: "RUNTIME_ERROR",
        message: "boom"
      }
    });
  });

  it("should normalize unknown thrown values to the unknown runtime fallback", () => {
    const writer = new MemoryWriter();

    writeError(writer, "compat.probe", null);

    expect(JSON.parse(writer.output)).toEqual({
      ok: false,
      command: "compat.probe",
      error: {
        code: "RUNTIME_ERROR",
        message: "Unknown error."
      }
    });
  });

  it("should format human-readable errors from agent errors", () => {
    expect(formatHumanError(new NotFoundError("missing"))).toBe(
      "NOT_FOUND: missing"
    );
  });

  it("should format human-readable errors from plain errors", () => {
    expect(formatHumanError(new Error("boom"))).toBe("RUNTIME_ERROR: boom");
  });
});
