import type { I18nConfig } from "fumadocs-core/i18n";

export const i18n: I18nConfig = {
  defaultLanguage: "pt",
  languages: ["pt", "en"],
};

export const locales = i18n.languages;
export type Locale = (typeof i18n.languages)[number];
