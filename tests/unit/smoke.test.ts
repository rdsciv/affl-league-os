import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("greenfield scaffold", () => {
  it("declares the isolated AFFL application", () => {
    expect(packageJson.name).toBe("affl-greenfield");
    expect(packageJson.private).toBe(true);
  });
});
