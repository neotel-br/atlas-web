import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/lib/source";
import { LocaleSwitch } from "@/components/locale-switch";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <DocsLayout
      tree={source.pageTree[lang]}
      nav={{ title: "NeoDocs" }}
      sidebar={{
        // order-first lifts the locale switch above the theme-toggle row in the
        // sidebar footer (a flex-col), so pt|en sits on top of the dark/light button.
        footer: <LocaleSwitch current={lang} className="order-first justify-center pb-1" />,
      }}
    >
      {children}
    </DocsLayout>
  );
}
