export const REQUIRES_CONNECTION_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Requiere conexión · SaborU</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fff6e5; color: #2b2b2b; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; padding: 24px; }
  main { max-width: 34rem; }
  .brand { font-weight: 700; font-size: .875rem; }
  h1 { font-size: 2.5rem; line-height: 1.05; margin: .75rem 0 0; }
  p { line-height: 1.6; color: rgba(43, 43, 43, .8); }
  a { color: #2b2b2b; font-weight: 600; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
</style>
</head>
<body>
<main>
  <p class="brand">SaborU</p>
  <h1>Requiere conexión</h1>
  <p>El panel y las pantallas de cuenta necesitan internet. No mostramos datos guardados de tu sesión aquí. Vuelve a conectarte para continuar.</p>
  <div class="actions">
    <a href="/offline">Ver catálogo sin conexión</a>
  </div>
</main>
</body>
</html>`;
