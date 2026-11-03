import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo SaborU trata los datos personales de estudiantes y vendedores (Ley 1581 de 2012).",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8">
        <p className="text-sm font-semibold text-carbon/60">SaborU</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight text-carbon sm:text-5xl">
          Política de privacidad
        </h1>
        <p className="mt-3 text-sm text-carbon/60">
          Última actualización: 3 de noviembre de 2026.
        </p>

        <div className="mt-8 flex flex-col gap-8 text-base leading-relaxed text-carbon/85">
          <section aria-labelledby="responsable">
            <h2
              id="responsable"
              className="font-display text-2xl font-semibold text-carbon"
            >
              Quién trata tus datos
            </h2>
            <p className="mt-2">
              SaborU S.A.S. es responsable del tratamiento. Para ejercer tus
              derechos o hacer una consulta, escribe a{" "}
              <a
                href="mailto:hola@saboru.app"
                className="font-semibold text-carbon underline underline-offset-4"
              >
                hola@saboru.app
              </a>
              .
            </p>
          </section>

          <section aria-labelledby="datos">
            <h2
              id="datos"
              className="font-display text-2xl font-semibold text-carbon"
            >
              Qué datos usamos
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Tu correo institucional y, si lo proporcionas, tu nombre. El
                correo permite verificar que estudias en la UPTC.
              </li>
              <li>
                Las reseñas, reportes y favoritos que creas, junto con su fecha
                y el local o producto al que se refieren.
              </li>
              <li>
                Los datos del local y del vendedor que gestiona un negocio del
                campus (nombre, ubicación, horario y fotos).
              </li>
              <li>
                Datos técnicos mínimos de seguridad y funcionamiento, como la
                sesión y el estado sin conexión. No usamos analítica con
                identificadores personales.
              </li>
            </ul>
          </section>

          <section aria-labelledby="finalidad">
            <h2
              id="finalidad"
              className="font-display text-2xl font-semibold text-carbon"
            >
              Para qué los usamos
            </h2>
            <p className="mt-2">
              Para autenticarte, verificar tu correo institucional, mostrarte el
              catálogo, publicar y moderar reseñas, atender reportes, permitir
              que los vendedores gestionen su local y mantener la seguridad del
              servicio.
            </p>
          </section>

          <section aria-labelledby="autorizacion">
            <h2
              id="autorizacion"
              className="font-display text-2xl font-semibold text-carbon"
            >
              Autorización y consentimiento
            </h2>
            <p className="mt-2">
              Al registrarte aceptas esta política y autorizas de forma previa,
              expresa e informada el tratamiento de tus datos para las
              finalidades descritas, conforme a la Ley 1581 de 2012. Puedes
              negar o revocar la autorización, pero algunas funciones que
              dependen de tu cuenta dejarán de estar disponibles.
            </p>
          </section>

          <section aria-labelledby="derechos">
            <h2
              id="derechos"
              className="font-display text-2xl font-semibold text-carbon"
            >
              Tus derechos
            </h2>
            <p className="mt-2">
              Puedes conocer, actualizar, rectificar y solicitar la supresión de
              tus datos, revocar la autorización y presentar quejas ante la
              Superintendencia de Industria y Comercio. Escríbenos a{" "}
              <a
                href="mailto:hola@saboru.app"
                className="font-semibold text-carbon underline underline-offset-4"
              >
                hola@saboru.app
              </a>{" "}
              y responderemos en los plazos legales.
            </p>
          </section>

          <section aria-labelledby="conservacion">
            <h2
              id="conservacion"
              className="font-display text-2xl font-semibold text-carbon"
            >
              Conservación y seguridad
            </h2>
            <p className="mt-2">
              Conservamos los datos mientras tu cuenta esté activa o mientras
              sean necesarios para atender obligaciones y reclamos. Aplicamos
              control de acceso, cifrado en tránsito y borrado de datos privados
              locales al cerrar sesión. No vendemos datos personales.
            </p>
          </section>

          <section aria-labelledby="cambios">
            <h2
              id="cambios"
              className="font-display text-2xl font-semibold text-carbon"
            >
              Cambios a esta política
            </h2>
            <p className="mt-2">
              Si cambiamos esta política, publicaremos la nueva versión en esta
              página y actualizaremos la fecha. Los cambios sustanciales se
              avisarán antes de aplicarse.
            </p>
          </section>
        </div>

        <p className="mt-10 text-sm text-carbon/70">
          <Link
            href="/"
            className="font-semibold text-carbon underline underline-offset-4"
          >
            Volver al inicio
          </Link>
        </p>
      </main>
    </div>
  );
}
