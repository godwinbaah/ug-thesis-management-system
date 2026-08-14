import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/forms";
import { Logo } from "@/components/logo";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Logo className="mb-4 h-11 w-11" />
        <h1 className="mb-1 text-lg font-semibold text-blue-800">UG Thesis Management</h1>
        <p className="mb-5 text-sm text-slate-500">
          Sign in with your institutional account.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
