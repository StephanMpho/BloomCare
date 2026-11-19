import Link from "next/link";
import { Heart, ThumbsUp, Scale, Ban, Stethoscope, Smile, Frown } from "lucide-react";
import { requireContext } from "@/lib/context";
import { can } from "@/lib/permissions";
import { toleranceLists } from "@/lib/queries";
import { FOOD_GROUPS, FOOD_GROUP_KEYS, type Healthiness } from "@/lib/content/food-groups";
import { FOOD_SAFETY } from "@/lib/content/food-safety";
import { NUTRIENT_GUIDE } from "@/lib/content/nutrients";
import { CONTENT_REVIEW } from "@/lib/content/sources";
import { Card, CardTitle, PageHeader, Badge, Note } from "@/components/ui";
import { PrintButton } from "@/components/forms";

const groupsWith = (h: Healthiness) => FOOD_GROUP_KEYS.filter((k) => k !== "other" && k !== "mixed-dish" && FOOD_GROUPS[k].healthiness === h).map((k) => FOOD_GROUPS[k]);

/** "Her food list": what to eat often, now and then, and avoid, from BloomCare's sourced content. */
export default async function FoodList() {
  const ctx = await requireContext();
  const showPersonal = can(ctx.access, "VIEW_TOLERANCE");
  const tol = showPersonal ? await toleranceLists(ctx.pregnancy.id) : null;
  const avoid = FOOD_SAFETY.filter((e) => e.category === "AVOID");
  const ask = FOOD_SAFETY.filter((e) => e.category === "ASK_CLINICIAN");

  const GroupList = ({ h }: { h: Healthiness }) => (
    <ul className="space-y-3">
      {groupsWith(h).map((g) => (
        <li key={g.key}>
          <p className="font-semibold">{g.label} <span className="font-normal text-muted dark:text-white/60">· {g.examples}</span></p>
          <p className="text-sm">{g.why}{g.tip && <> <em>{g.tip}</em></>}</p>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`${ctx.pregnancy.preferredName}'s food list`}
        subtitle="What to eat often, what to keep for now and then, and what to avoid in pregnancy. Use it when shopping."
        action={<div className="no-print flex gap-2"><Link href="/planner" className="text-sm underline">Meal plan</Link><PrintButton /></div>} />

      {tol && (tol.tolerated.length > 0 || tol.notTolerated.length > 0) && (
        <Card tone="blush">
          <CardTitle>From her own diary</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="mb-1 flex items-center gap-1 text-sm font-semibold"><Smile size={16} /> Sits well with her</p>
              <div className="flex flex-wrap gap-1.5">{tol.tolerated.length ? tol.tolerated.slice(0, 15).map((t) => <Badge key={t.name} tone="good">{t.name}</Badge>) : <Note>Nothing yet.</Note>}</div></div>
            <div><p className="mb-1 flex items-center gap-1 text-sm font-semibold"><Frown size={16} /> Hasn&apos;t sat well</p>
              <div className="flex flex-wrap gap-1.5">{tol.notTolerated.length ? tol.notTolerated.slice(0, 15).map((t) => <Badge key={t.name} tone="warn">{t.name}</Badge>) : <Note>Nothing yet.</Note>}</div></div>
          </div>
          <Note className="mt-2">Her own experience comes first: the meal plan skips foods that haven&apos;t sat well.</Note>
        </Card>
      )}

      <Card tone="sage">
        <CardTitle icon={<Heart size={18} />}>Eat often</CardTitle>
        <GroupList h="GREAT" />
      </Card>

      <Card>
        <CardTitle icon={<ThumbsUp size={18} />}>Good choices most days</CardTitle>
        <GroupList h="GOOD" />
      </Card>

      <Card>
        <CardTitle>Key nutrients and where to find them</CardTitle>
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {NUTRIENT_GUIDE.map((n) => (
            <li key={n.key} className="text-sm"><span className="font-semibold">{n.name}:</span> {n.foods.join(", ")}</li>
          ))}
        </ul>
        <Note className="mt-2">Supplements such as folic acid and iron are separate: only take what her clinician or pharmacist recommends.</Note>
      </Card>

      <Card>
        <CardTitle icon={<Scale size={18} />}>Now and then</CardTitle>
        <GroupList h="LIMIT" />
      </Card>

      <Card className="border-2 border-red-200 dark:border-red-900">
        <CardTitle icon={<Ban size={18} />}>Avoid in pregnancy</CardTitle>
        <ul className="space-y-2">
          {avoid.map((e) => <li key={e.key}><p className="font-semibold">{e.name}</p><p className="text-sm">{e.summary}</p></li>)}
        </ul>
        <p className="mt-4 flex items-center gap-1 font-semibold"><Stethoscope size={16} /> Ask her clinician first</p>
        <ul className="mt-1 space-y-2">
          {ask.map((e) => <li key={e.key}><p className="font-semibold">{e.name}</p><p className="text-sm">{e.summary}</p></li>)}
        </ul>
        <Note className="mt-3">Some foods are safe only when prepared a certain way (eggs, meat, polony, cheese, fish). The <Link className="underline" href="/guide">food safety guide</Link> explains each one.</Note>
      </Card>

      <Note>{CONTENT_REVIEW.status} Sources: NHS pregnancy diet and foods-to-avoid guidance, WHO, SA Department of Health.</Note>
    </div>
  );
}
