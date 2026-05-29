import { describe, it, expect } from "vitest";
import pt from "@/messages/pt.json";
import en from "@/messages/en.json";

function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? flatKeys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("i18n message parity", () => {
  it("pt and en have identical key sets", () => {
    expect(flatKeys(pt).sort()).toEqual(flatKeys(en).sort());
  });
});
