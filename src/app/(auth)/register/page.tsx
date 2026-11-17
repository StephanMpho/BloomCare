import Link from "next/link";
import { ActionForm, Submit } from "@/components/forms";
import { Field, Input, Check } from "@/components/ui";
import { registerAction } from "@/app/actions/auth";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const partner = sp.next?.startsWith("/invite/");
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">{partner ? "Create your partner account" : "Create your account"}</h1>
      <p className="mb-4 text-sm text-muted dark:text-white/70">{partner ? "You'll only see what she chooses to share." : "Each person uses their own account. You can invite your partner later."}</p>
      <ActionForm action={registerAction} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <Field label="Your name"><Input name="name" autoComplete="name" required /></Field>
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password" hint="At least 10 characters."><Input name="password" type="password" autoComplete="new-password" minLength={10} required /></Field>
        <Check name="privacy" label="I understand BloomCare stores pregnancy and health notes privately for me, and only shares what I choose." />
        <Submit className="w-full" variant="rose">Create account</Submit>
      </ActionForm>
      <p className="mt-4 text-center text-sm">Already have an account? <Link href={`/login${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="font-semibold text-rose underline">Sign in</Link></p>
    </>
  );
}
