import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Submit } from "@/components/forms";
import { Field, Input } from "@/components/ui";
import { loginAction } from "@/app/actions/auth";
import { currentUser } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; deleted?: string }> }) {
  const sp = await searchParams;
  if (await currentUser()) redirect(sp.next ?? "/");
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Welcome back</h1>
      {sp.deleted && <p className="mb-4 rounded-2xl bg-sage/40 p-3 text-sm">Your account and all its records have been deleted.</p>}
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        <Submit className="w-full">Sign in</Submit>
      </ActionForm>
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/forgot" className="text-lavender-deep underline dark:text-lavender">Forgot password?</Link>
        <Link href={`/register${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="font-semibold text-rose underline">Create an account</Link>
      </div>
    </>
  );
}
