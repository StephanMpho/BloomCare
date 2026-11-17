import Link from "next/link";
import { ActionForm, Submit } from "@/components/forms";
import { Field, Input } from "@/components/ui";
import { forgotAction } from "@/app/actions/auth";

export default function ForgotPage() {
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Reset your password</h1>
      <ActionForm action={forgotAction} className="space-y-4">
        <Field label="Email"><Input name="email" type="email" required /></Field>
        <Submit className="w-full">Send reset link</Submit>
      </ActionForm>
      <p className="mt-4 text-center text-sm"><Link href="/login" className="underline">Back to sign in</Link></p>
    </>
  );
}
