import { Button } from "@/components/ui/button";
import { setEstablishmentStatusAction } from "@/server/actions/admin";

export function EstablishmentStatusForm({
  establishmentId,
  status,
}: {
  establishmentId: string;
  status: string;
}) {
  const nextStatus = status === "active" ? "suspended" : "active";
  const label =
    status === "active"
      ? "Suspender"
      : status === "suspended"
        ? "Reactivar"
        : "Aprobar local";

  return (
    <form action={setEstablishmentStatusAction} className="w-full sm:w-auto">
      <input type="hidden" name="establishmentId" value={establishmentId} />
      <input type="hidden" name="status" value={nextStatus} />
      <Button
        type="submit"
        size="sm"
        variant={status === "active" ? "secondary" : "default"}
      >
        {label}
      </Button>
    </form>
  );
}
