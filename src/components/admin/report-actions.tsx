import { Button } from "@/components/ui/button";
import { REPORT_STATUS_LABELS } from "@/lib/admin/labels";
import { setReportStatusAction } from "@/server/actions/admin";

export function ReportActions({
  reportId,
  status,
}: {
  reportId: string;
  status: string;
}) {
  if (status !== "open") {
    return (
      <p className="text-sm font-semibold text-carbon/70">
        {REPORT_STATUS_LABELS[status] ?? status}
      </p>
    );
  }

  return (
    <form
      action={setReportStatusAction}
      className="flex w-full flex-wrap gap-2 sm:w-auto"
    >
      <input type="hidden" name="reportId" value={reportId} />
      <Button type="submit" size="sm" name="status" value="reviewed">
        Marcar revisado
      </Button>
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        name="status"
        value="dismissed"
      >
        Descartar
      </Button>
    </form>
  );
}
