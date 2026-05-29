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
      nav={{ title: "NeoDocs", children: <LocaleSwitch current={lang} /> }}
    >
      {children}
    </DocsLayout>
  );
}
