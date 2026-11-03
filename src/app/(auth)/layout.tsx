import Link from "next/link";

import { SaboruLogo } from "@/components/brand/saboru-logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-12 sm:px-8">
      <Link href="/" className="mb-8 w-fit" aria-label="SaborU, ir al inicio">
        <SaboruLogo className="h-11 w-auto" />
      </Link>
      {children}
    </div>
  );
}
