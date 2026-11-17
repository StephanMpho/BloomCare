import Link from "next/link";
import { Camera } from "lucide-react";
import { requireContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { formatDateTime } from "@/lib/dates";
import { activePartner, recentPhotoChecks } from "@/lib/queries";
import { Card, CardTitle, PageHeader, Empty, Note } from "@/components/ui";
import { PhotoCheck } from "@/components/photo-check";
import { OverallVerdict, VerdictList } from "@/components/photo-verdict-view";

export default async function PhotoCheckPage() {
  // Photo-check results are visible to an accepted partner regardless of share settings
  // (the owner chose this; she is told on the camera screen before every check).
  const ctx = await requireContext();
  const canCheck = can(ctx.access, "LOG_FOR_ME");
  const [history, partner] = await Promise.all([
    recentPhotoChecks(ctx.pregnancy.id),
    ctx.isOwner ? activePartner(ctx.pregnancy.id) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Photo food check"
        subtitle={ctx.isOwner ? "Snap your plate. We'll recognise the food and check it against BloomCare's reviewed food-safety guide." : `Photo checks for ${ctx.pregnancy.preferredName}'s meals.`}
        action={<Link href="/food" className="text-sm underline">Food diary</Link>} />

      {canCheck && (
        <Card>
          <PhotoCheck partnerWillSee={ctx.isOwner ? !!partner : true} partnerName={partner?.name} />
          <Note className="mt-4">
            The photo is sent to Claude (Anthropic&apos;s AI) only to recognise the food, then discarded. It isn&apos;t saved. The AI doesn&apos;t decide what&apos;s safe: verdicts come from BloomCare&apos;s sourced food-safety library and her own logs. This is general guidance, not medical advice.
          </Note>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Recent checks</h2>
        {history.length === 0 ? (
          <Empty icon={<Camera />} title="No photo checks yet">Checks will appear here.</Empty>
        ) : history.map((h) => (
          <Card key={h.id}>
            <CardTitle>{formatDateTime(h.createdAt)}</CardTitle>
            <div className="space-y-3">
              <OverallVerdict level={h.overall} />
              <VerdictList items={h.items} canLog={canCheck} />
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
