import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePermission } from "@/lib/context";
import { formatTime, toISODate } from "@/lib/dates";
import { saveFoodLog } from "@/app/actions/logs";
import { FoodLogForm } from "@/components/food-form";
import { Card, PageHeader } from "@/components/ui";
import { foodFormData } from "../../shared";

export default async function EditFood({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission("LOG_FOR_ME");
  const { id } = await params;
  const log = await db.query.foodLogs.findFirst({ where: and(eq(schema.foodLogs.id, id), eq(schema.foodLogs.pregnancyId, ctx.pregnancy.id)) });
  if (!log) notFound();
  const { foods, favourites } = await foodFormData(ctx.pregnancy.ownerId, ctx.pregnancy.id);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit entry" />
      <Card><FoodLogForm foods={foods} favourites={favourites} action={saveFoodLog} initial={{ ...log, date: toISODate(log.eatenAt), time: formatTime(log.eatenAt) }} /></Card>
    </div>
  );
}
