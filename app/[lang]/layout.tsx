import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { RootProvider } from "fumadocs-ui/provider";
import { I18nProvider } from "fumadocs-ui/i18n";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { locales } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!locales.includes(lang)) notFound();
  setRequestLocale(lang);
  const messages = await getMessages();

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider messages={messages}>
          <RootProvider>
            <I18nProvider
              locale={lang}
              locales={[...locales].map((l) => ({ locale: l, name: l.toUpperCase() }))}
            >
              {children}
            </I18nProvider>
          </RootProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
