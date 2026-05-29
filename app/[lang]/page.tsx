import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { auth } from "@/lib/auth/config";

export default async function Landing({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  await auth(); // route is guarded by middleware; this primes session context
  const t = await getTranslations("landing");
  return (
    <main className="m-auto flex flex-col items-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-bold">{t("welcome")}</h1>
      <Link
        className="rounded bg-fd-primary px-4 py-2 text-fd-primary-foreground"
        href={`/${lang}/docs`}
      >
        {t("openDocs")}
      </Link>
    </main>
  );
}
