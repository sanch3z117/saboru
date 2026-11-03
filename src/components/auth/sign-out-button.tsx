import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction} className="mt-8">
      <Button type="submit" variant="secondary">
        Cerrar sesión
      </Button>
    </form>
  );
}
