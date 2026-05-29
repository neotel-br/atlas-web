import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <main className="flex min-h-screen">
      <LoginForm lang={lang} />
    </main>
  );
}
