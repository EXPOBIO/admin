commit 88d549eb66f630571b18c9e7e669d93822289723
Author: Sam <samthekiller20001726@gmail.com>
Date:   Sun Oct 18 17:46:21 2026 -0500

    feat(admin): soportar doble voucher en misma celda (split , ; \n) + columna Voucher2

diff --git a/backend_appscript/Admin.gs b/backend_appscript/Admin.gs
new file mode 100644
index 0000000..69ad583
--- /dev/null
+++ b/backend_appscript/Admin.gs
@@ -0,0 +1,151 @@
+/**
+ * ADMIN API — EXPOBIO 2026
+ * =========================================================
+ * Backend del panel de gestión (secret: nunca se sube a git).
+ * Google Apps Script INDEPENDIENTE (openById, no container-bound).
+ * Deploy: Web app > Ejecutar como: Yo > Acceso: Cualquiera.
+ *
+ * Autenticación: usuario + contraseña (hoja Gestores) →
+ * token aleatorio con expiración (hoja Sesiones). El panel
+ * estático (repo EXPOBIO/admin) manda { accion, token, ... }.
+ * =========================================================
+ */
+
+const CONFIG = {
+  SPREADSHEET_ID: '17kQ143-u103Z6TMrDHNLIjhHMuLvKG2lBJJmO-UbgcM',
+  HOJA_INSCRIPCIONES: 'Inscripciones',
+  HOJA_ORGANIZADORES: 'Organizadores',
+  HOJA_ELIMINADOS: 'Eliminados',
+  CARPETA_VOUCHERS_ID: '1Vz6M1jKkzZoYRSPQNFhHK5idSubASavx',
+  NOMBRE_EVENTO: 'EXPOBIO 2026'
+};
+
+const ACCIONES_PUBLICAS = ['login'];
+
+function doPost(e) {
+  return responder_(rutear(e));
+}
+
+function doGet() {
+  return responder_({ ok: false, mensaje: 'Usa POST.' });
+}
+
+function rutear(e) {
+  try {
+    const body = parseBody_(e);
+    const accion = String(body.accion || '');
+
+    // Acciones públicas (solo login)
+    if (accion === 'login') return autenticarGestor_(body);
+
+    // El resto requiere token válido
+    const sesion = validarSesion_(body.token);
+    if (!sesion) {
+      return { ok: false, error: 'no_auth', mensaje: 'Sesión inválida o expirada.' };
+    }
+
+    switch (accion) {
+      case 'verificar':           return { ok: true, gestor: sesion };
+      case 'logout':              return cerrarSesion_(sesion);
+      case 'cambiarClave':        return mutar_(function () { return cambiarClave_(sesion, body); });
+
+      case 'resumen':             return servirCache_('resumen', 300, obtenerResumen_);
+      case 'listarInscripciones': return listarInscripciones_(body);
+      case 'obtenerInscripcion':  return obtenerInscripcion_(body);
+      case 'editarInscripcion':   return mutar_(function () { return editarInscripcion_(body); });
+      case 'cambiarEstado':       return mutar_(function () { return cambiarEstado_(sesion, body); });
+      case 'eliminarInscripcion': return mutar_(function () { return eliminarInscripcion_(sesion, body); });
+      case 'exportarInscritos':   return exportarInscritos_();
+      case 'estadisticas':        return obtenerEstadisticas_();
+
+      case 'listarOrganizadores': return listarOrganizadores_();
+      case 'resumenOrganizadores': return servirCache_('resumenOrg', 300, resumenOrganizadores_);
+      case 'agregarOrganizador':  return mutar_(function () { return agregarOrganizador_(body); });
+      case 'actualizarOrganizador': return mutar_(function () { return actualizarOrganizador_(body); });
+      case 'cambiarEstadoOrganizador': return mutar_(function () { return cambiarEstadoOrganizador_(body); });
+      case 'eliminarOrganizador': return mutar_(function () { return eliminarOrganizador_(body); });
+      case 'asignarIdOrganizador':return mutar_(function () { return asignarIdOrganizador_(body); });
+      case 'borrarVoucher':       return mutar_(function () { return borrarVoucher_(body); });
+      case 'subirVoucher2':       return mutar_(function () { return subirVoucher2_(body); });
+
+      case 'registrarManual':     return mutar_(function () { return registrarManual_(body); });
+
+      case 'listarGestores':      return listarGestores_(body);
+      case 'crearGestor':         return mutar_(function () { return crearGestor_(sesion, body); });
+      case 'actualizarGestor':    return mutar_(function () { return actualizarGestor_(sesion, body); });
+      case 'eliminarGestor':      return mutar_(function () { return eliminarGestor_(sesion, body); });
+
+      case 'listarTareas':        return listarTareas_();
+      case 'resumenTareas':       return resumenTareas_();
+      case 'crearTarea':          return mutar_(function () { return crearTarea_(body); });
+      case 'actualizarTarea':     return mutar_(function () { return actualizarTarea_(body); });
+      case 'eliminarTarea':       return mutar_(function () { return eliminarTarea_(sesion, body); });
+
+      case 'listarActas':         return listarActas_();
+      case 'resumenActas':        return resumenActas_();
+      case 'crearActa':           return mutar_(function () { return crearActa_(body); });
+      case 'actualizarActa':      return mutar_(function () { return actualizarActa_(body); });
+      case 'eliminarActa':        return mutar_(function () { return eliminarActa_(sesion, body); });
+
+      default:
+        return { ok: false, mensaje: 'Acción desconocida: ' + accion };
+    }
+  } catch (err) {
+    console.error('Error en rutear: ' + err);
+    return { ok: false, mensaje: 'Error interno: ' + err.message };
+  }
+}
+
+function parseBody_(e) {
+  try { return JSON.parse(e.postData.contents); } catch (err) { return {}; }
+}
+
+function responder_(obj) {
+  return ContentService
+    .createTextOutput(JSON.stringify(obj))
+    .setMimeType(ContentService.MimeType.JSON);
+}
+
+/**
+ * Marca que hubo una escritura: la caché de lecturas se invalida.
+ * Se usa un timestamp como versión; las lecturas se guardan con un
+ * marcador que incluye esa versión, así caducan solas al escribir.
+ */
+function marcarEscritura_() {
+  try {
+    CacheService.getScriptCache().put('_v', String(new Date().getTime()), 21600);
+  } catch (err) {
+    /* la caché es un plus, nunca debe tumbar la petición */
+  }
+}
+
+/**
+ * Ejecuta una mutación y siempre invalida la caché de lecturas.
+ */
+function mutar_(fn) {
+  try {
+    return fn();
+  } finally {
+    marcarEscritura_();
+  }
+}
+
+/**
+ * Lectura pesada con caché de script. Se guarda por versión de
+ * escrituras (_v): basta con que cambie para servirse datos frescos.
+ * Ante cualquier error se recalcula en vivo.
+ */
+function servirCache_(clave, ttlSeg, generador) {
+  try {
+    const cache = CacheService.getScriptCache();
+    const version = cache.get('_v') || '0';
+    const marcador = clave + '::' + version;
+    const guardado = cache.get(marcador);
+    if (guardado !== null) return JSON.parse(guardado);
+    const valor = generador();
+    cache.put(marcador, JSON.stringify(valor), ttlSeg);
+    return valor;
+  } catch (err) {
+    return generador();
+  }
+}
\ No newline at end of file
