import { Button } from "@/components/ui/button";
import { createInviteAction } from "@/server/actions/admin";

export function InviteForm({
  establishments,
}: {
  establishments: { id: string; name: string }[];
}) {
  if (establishments.length === 0) {
    return (
      <p className="mt-3 text-sm leading-relaxed text-carbon/70">
        No hay locales sin dueño. Crea uno nuevo o libera un local antes de
        invitar a un vendedor.
      </p>
    );
  }

  return (
    <form action={createInviteAction} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="invite-email"
          className="text-sm font-medium text-carbon"
        >
          Correo del vendedor
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="vendedor@correo.com"
          className="h-11 border border-carbon bg-cream px-3 text-base text-carbon placeholder:text-carbon/45"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="invite-establishment"
          className="text-sm font-medium text-carbon"
        >
          Local sin dueño
        </label>
        <select
          id="invite-establishment"
          name="establishmentId"
          required
          defaultValue={establishments[0]?.id}
          className="h-11 border border-carbon bg-cream px-2 text-base text-carbon"
        >
          {establishments.map((establishment) => (
            <option key={establishment.id} value={establishment.id}>
              {establishment.name}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" className="w-fit">
        Crear invitación
      </Button>
    </form>
  );
}
