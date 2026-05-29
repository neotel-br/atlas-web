import { getRequestConfig } from "next-intl/server";
import { locales } from "@/lib/i18n";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = locales.includes(requested ?? "") ? (requested as string) : "pt";
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
