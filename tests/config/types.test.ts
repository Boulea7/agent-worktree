import { describe, expectTypeOf, it } from "vitest";

import type { ProjectDefaultsConfig } from "../../src/config/types.js";

describe("config exported types", () => {
  it("should keep defaults aligned with the current vocabulary", () => {
    expectTypeOf<ProjectDefaultsConfig["execution_mode"]>().toEqualTypeOf<
      "headless_event_stream" | "interactive_terminal"
    >();
    expectTypeOf<ProjectDefaultsConfig["safety_intent"]>().toEqualTypeOf<
      | "plan_readonly"
      | "workspace_write_with_approval"
      | "workspace_write_auto_edit"
      | "full_access"
    >();
  });
});
