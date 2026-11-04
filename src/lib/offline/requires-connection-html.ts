export const REQUIRES_CONNECTION_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Requiere conexión · SaborU</title>
<style>
  :root { color-scheme: light; --campus: #f5b800; --antojo: #f26b21; --carbon: #2b2b2b; --cream: #fff6e5; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; background: var(--cream); color: var(--carbon); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; padding: 24px; }
  .brand { display: flex; align-items: center; gap: 10px; margin: 0 auto 24px; width: 100%; max-width: 44rem; }
  .brand svg { width: 42px; height: 42px; flex: none; }
  .brand-name { font-family: ui-rounded, system-ui, sans-serif; font-size: 1.5rem; font-weight: 800; letter-spacing: -.02em; }
  .brand-name .u { color: var(--antojo); }
  .brand-tag { display: block; font-size: .75rem; font-weight: 400; letter-spacing: 0; color: rgba(43,43,43,.65); }
  main { width: 100%; max-width: 44rem; margin: auto; border: 2px solid var(--carbon); border-radius: 12px; background: var(--cream); box-shadow: 4px 4px 0 0 var(--carbon); padding: clamp(24px, 6vw, 48px); }
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; margin: 0; border: 2px solid var(--carbon); border-radius: 9999px; background: var(--campus); padding: 4px 12px; font-size: .8125rem; font-weight: 700; }
  h1 { font-family: ui-rounded, system-ui, sans-serif; font-size: clamp(2rem, 6vw, 2.75rem); line-height: 1.05; letter-spacing: -.03em; margin: 16px 0 0; }
  p { line-height: 1.6; color: rgba(43,43,43,.82); }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
  .button { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; border: 2px solid var(--carbon); border-radius: 9999px; background: var(--antojo); color: var(--carbon); padding: 0 18px; font-size: .9375rem; font-weight: 700; text-decoration: none; box-shadow: 2px 2px 0 0 var(--carbon); }
  .button:hover { filter: brightness(.95); }
  .button:focus-visible, a:focus-visible { outline: 2px solid var(--carbon); outline-offset: 3px; }
  .note { margin: 20px 0 0; font-size: .8125rem; color: rgba(43,43,43,.6); }
</style>
</head>
<body>
  <header class="brand">
    <svg viewBox="0 0 256 256" role="img" aria-label="Pin de SaborU" focusable="false">
      <path d="M128 24C82 24 44 62 44 108c0 48 54 92 78 124 2.6 3.4 9.4 3.4 12 0 24-32 78-76 78-124 0-46-38-84-84-84Z" fill="#f5b800" stroke="#2b2b2b" stroke-width="8" stroke-linejoin="round"/>
      <circle cx="128" cy="106" r="42" fill="#fff6e5" stroke="#2b2b2b" stroke-width="6"/>
      <path d="M110 90v20c0 12 8 20 18 20s18-8 18-20V90" fill="none" stroke="#2b2b2b" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m128 88 3.5 8.4 9.1.8-6.9 6 2.1 8.9-7.8-4.7-7.8 4.7 2.1-8.9-6.9-6 9.1-.8Z" fill="#f26b21" stroke="#f26b21" stroke-width="3" stroke-linejoin="round"/>
    </svg>
    <span class="brand-name">Sabor<span class="u">U</span><span class="brand-tag">Antojo con criterio.</span></span>
  </header>
  <main>
    <p class="eyebrow">Sin datos de tu sesión</p>
    <h1>Requiere conexión</h1>
    <p>El panel y las pantallas de cuenta necesitan internet. No mostramos datos guardados de tu sesión aquí. Vuelve a conectarte para continuar.</p>
    <div class="actions">
      <a class="button" href="/offline">Ver catálogo sin conexión</a>
    </div>
    <p class="note">Puedes seguir consultando el catálogo público sin conexión.</p>
  </main>
</body>
</html>`;
