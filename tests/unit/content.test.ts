import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import matter from "gray-matter";

const categories = ["documentation", "processes", "reports"] as const;
const pages: Record<(typeof categories)[number], string[]> = {
  documentation: ["index", "overview"],
  processes: ["index", "onboarding"],
  reports: ["index", "monthly"],
};
const locales = [
  { suffix: "", lang: "pt" },
  { suffix: ".en", lang: "en" },
];

describe("content tree", () => {
  for (const cat of categories) {
    for (const page of pages[cat]) {
      for (const { suffix } of locales) {
        const file = `content/docs/${cat}/${page}${suffix}.mdx`;
        it(`${file} exists with a title`, () => {
          expect(existsSync(file)).toBe(true);
          const { data } = matter(readFileSync(file, "utf8"));
          expect(typeof data.title).toBe("string");
          expect(data.title.length).toBeGreaterThan(0);
        });
      }
    }
  }
  it("each category has meta.json", () => {
    for (const cat of categories) {
      expect(existsSync(`content/docs/${cat}/meta.json`)).toBe(true);
    }
  });
});
