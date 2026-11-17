import { ActionForm, Submit } from "@/components/forms";
import { Field, Input } from "@/components/ui";
import { resetAction } from "@/app/actions/auth";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <h1 className="mb-4 text-xl font-semibold">Choose a new password</h1>
      <ActionForm action={resetAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="New password" hint="At least 10 characters."><Input name="password" type="password" minLength={10} autoComplete="new-password" required /></Field>
        <Submit className="w-full">Save password</Submit>
      </ActionForm>
    </>
  );
}
