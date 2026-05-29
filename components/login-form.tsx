"use client";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ lang }: { lang: string }) {
  const t = useTranslations("login");
  const router = useRouter();
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(false);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError(true);
      return;
    }
    router.push(`/${lang}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="m-auto flex w-80 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <label className="flex flex-col gap-1">
        {t("email")}
        <input name="email" type="email" required className="rounded border px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1">
        {t("password")}
        <input name="password" type="password" required className="rounded border px-2 py-1" />
      </label>
      {error && <p className="text-sm text-red-600">{t("error")}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-fd-primary px-4 py-2 text-fd-primary-foreground disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </form>
  );
}
