"use client";
import { usePathname, useRouter } from "next/navigation";
import { locales } from "@/lib/i18n";

export function LocaleSwitch({ current }: { current: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: string) {
    const segments = pathname.split("/").filter(Boolean);
    if (locales.includes(segments[0])) segments[0] = next;
    else segments.unshift(next);
    router.push("/" + segments.join("/"));
  }

  return (
    <div className="flex gap-2">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-current={l === current}
          className={l === current ? "font-bold underline" : "opacity-70"}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
