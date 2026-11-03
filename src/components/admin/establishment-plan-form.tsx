import { Button } from "@/components/ui/button";
import { PLAN_LABELS } from "@/lib/admin/labels";
import { setEstablishmentPlanAction } from "@/server/actions/admin";

export function EstablishmentPlanForm({
  establishmentId,
  establishmentName,
  plan,
}: {
  establishmentId: string;
  establishmentName: string;
  plan: string;
}) {
  return (
    <form
      action={setEstablishmentPlanAction}
      className="flex w-full flex-col gap-2 sm:w-auto"
    >
      <input type="hidden" name="establishmentId" value={establishmentId} />
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`plan-${establishmentId}`}
            className="text-xs font-medium text-carbon/70"
          >
            Plan de {establishmentName}
          </label>
          <select
            id={`plan-${establishmentId}`}
            name="plan"
            defaultValue={plan}
            className="h-9 border border-carbon bg-cream px-2 text-sm text-carbon"
          >
            {Object.entries(PLAN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" variant="secondary">
          Guardar plan
        </Button>
      </div>
    </form>
  );
}
