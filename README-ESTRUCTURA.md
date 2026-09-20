# ADMIN · Estructura y organización del proyecto

Panel de gestión del comité EXPOBIO 2026 (repo `EXPOBIO/admin`, GitHub Pages).
Este README explica **cómo está organizado** el código para orientarse rápido.
Para el despliegue y el uso funcional, ver `README.md`.

---

## Mapa general del monorepo (contexto)

La `hoja Inscripciones` (Google Sheet) la escriben **tres backends** que deben
estar SIEMPRE alineados en el encabezado (18 columnas):

| Proyecto | Backend (.gs) | Rol sobre la hoja |
|---|---|---|
| `INSCRIPCION` | `Utilidades.gs` (escribe `ENCABEZADOS_HOJA`) | **Escribe** las filas nuevas |
| `ADMIN` | `backend_appscript/*.gs` (este proyecto) | **Lee/muta** la misma hoja (panel) |
| `CONSULTAS` | `consulta.gs` (consulta pública) | **Lee** el estado por DNI |

**Columna 18 = `MotivoRechazo`** (el motivo se lae desde la consulta pública).
NO usar `AprobadoPor` ni quitar `MotivoRechazo`: rompe la compatibilidad
con las hojas que ya estaban avanzando.

---

## Estructura de carpetas de ADMIN

```
ADMIN/
├── index.html               Login del panel
├── panel.html               Estructura del panel (5 secciones)
├── README.md                Despliegue + uso (ver ahí para puesta a punto)
├── README-ESTRUCTURA.md     (este archivo)
├── css/
│   ├── base.css             Base visual (Sora/Inter, verde institucional)
│   ├── dark.css             Modo oscuro
│   ├── login.css            Estilos del login
│   └── panel.css            Layout del panel
├── js/
│   ├── config.js            URL de la Web App (rellenar al desplegar)
│   ├── api.js               fetch a la API + manejo de sesión (token)
│   ├── auth.js              Token e identidad del gestor
│   ├── tema.js              Modo claro/oscuro (localStorage)
│   └── secciones/
│       ├── resumen.js       Resumen: contadores + dinero por tipo de pago
│       ├── inscripciones.js Inscripciones: tabla/filtros/detalle/aprobar-rechazar/eliminar
│       ├── organizadores.js Organizadores del comité (IDs ORG-xxxx)
│       └── gestores.js      Gestores del panel (crear/activar, solo admin)
└── backend_appscript/       ⚠️ SECRETO · nunca en git (ver README.md)
    ├── Admin.gs             Router doPost doGet de la API
    ├── Auth.gs              Login, sesiones (Script Properties, hash+salt)
    ├── Inscripciones.gs     Listado, detalle, estado, voucher, CSV, registro manual
    ├── Organizadores.gs     Gestión del comité
    └── Utilidades.gs        Encabezados de hoja (única fuente, 18 cols → MotivoRechazo)
```

---

## Flujo de datos (una petición)

```
panel.html/js ──POST { accion, token, ... }──▶ backend_appscript (Apps Script)
  1. Auth.gs validarSesion_(token) → sesión o error no_auth
  2. Admin.gs rutear(...) → despacha por "accion"
  3. Acción (ej. cambiarEstado) → escribe en la hoja
  4. Respuesta { ok, mensaje, ... } → pintar en el panel
```

Los `.gs` **no se suben a git**; se pegan en script.google.com. Los IDs de
hoja/carpeta viven en `Admin.gs` (CONFIG) o en Script Properties.

---

## Funciones clave fuera del switch (no olvidar)

En la API (backend) solo se expone lo que está en el `switch` de `Admin.gs`
(`Admin.gs` → `rutear_`). Si agregas una acción nueva al back, agrégala al
`switch` y a `js/api.js` (`apiLlamada`).

**Encabezados (no tocar)**: `Utilidades.gs` → `ENCABEZADOS_INSCRIPCIONES`.
Cualquier cambio acá se refleja en Inscripciones y en la lectura de la hoja
`Eliminados` (misma base + `MotivoRechazo`/`MotivoEliminados`).

---

## Estado actual

- `backend_appscript/*.gs` pasa `node --check` y es compatible (MotivoRechazo).
- `js/secciones/inscripciones.js` restaurado a la versión del último commit
  (la modificación sin commitear estaba rota → syntax error). `node --check` OK.
- `git status` de ADMIN: solo `README-ESTRUCTURA.md` nuevo sin commitear.
