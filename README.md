# EXPOBIO · Panel de gestión (admin)

Panel del comité para gestionar las inscripciones de **EXPOBIO 2026**.

Desplegado como página estática en GitHub Pages: `https://expobio.github.io/admin/`

## Arquitectura

```
expobio.github.io/admin/   (este repo, frontend estático)
        │  POST { accion, token, ... }  →  JSON
        ▼
Google Apps Script "Admin"  ⚠️ SECRETO · NUNCA en este repo
        │  openById(SPREADSHEET_ID)
        ▼
Google Sheets: Inscripciones · Organizadores · Gestores · Sesiones · Precios
```

El frontend **no contiene secretos**. Todo el backend (`*.gs`) se mantiene
fuera de git, igual que en el resto de proyectos EXPOBIO.

## Estructura del frontend

| Archivo | Qué hace |
|---|---|
| `index.html` | Login (usuario + contraseña) |
| `panel.html` | Panel con 5 secciones |
| `css/base.css` | Base visual (Sora/Inter, verde institucional) |
| `css/panel.css` | Layout del panel |
| `js/config.js` | **URL de la Web App** (rellenar al desplegar) |
| `js/api.js` | Llamadas `fetch` a la API + manejo de sesión |
| `js/auth.js` | Token e identidad del gestor |
| `js/secciones/*.js` | Resumen · Inscripciones · Organizadores · Precios · Gestores |

## Puesta a punto (una sola vez)

1. **Crear la Web App**: copia estos `.gs` (viven en `backend_appscript/` de esta carpeta,
   **no subirlos jamás**) a un proyecto de script.google.com:
   `Admin.gs`, `Auth.gs`, `Inscripciones.gs`, `Organizadores.gs`,
   `Precios.gs`, `Utilidades.gs`.
2. **Crear la hoja Gestores** con una fila admin:
   `Usuario | HashClave | Comision | Rol | Activo`
   - `HashClave` = SHA-256 de la contraseña (genérate con un editor cualquiera).
   - `Rol` = `admin`.
3. **Desplegar** → Web app → Ejecutar como: *Yo* → Acceso: *Cualquiera* → copiar la URL `/exec`.
4. Pegar esa URL en `js/config.js` (`API_URL`) y hacer push.

> Nota: este panel no edita-hojas del formulario público de INSCRIPCION.
> Es una API independiente (las inscripciones llegan por el formulario o por
> *registro manual* del panel).

## Uso

- **Resumen**: contadores de inscripciones (total, pendientes, aprobados, rechazados, por tipo).
- **Inscripciones**: filtrar (estado/tipo/búsqueda), paginar, ver detalle con voucher, aprobar/rechazar, exportar CSV.
- **Organizadores**: listado del comité y asignación de IDs (ORG-XXXX).
- **Precios**: edición de costos por categoría.
- **Gestores**: crear usuarios y activar/desactivarlos (solo rol admin).