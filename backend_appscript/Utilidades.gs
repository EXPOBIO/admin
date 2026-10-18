commit 88d549eb66f630571b18c9e7e669d93822289723
Author: Sam <samthekiller20001726@gmail.com>
Date:   Sun Oct 18 17:46:21 2026 -0500

    feat(admin): soportar doble voucher en misma celda (split , ; \n) + columna Voucher2

diff --git a/backend_appscript/Utilidades.gs b/backend_appscript/Utilidades.gs
new file mode 100644
index 0000000..9ea30ca
--- /dev/null
+++ b/backend_appscript/Utilidades.gs
@@ -0,0 +1,56 @@
+/**
+ * UTILIDADES — helpers compartidos del admin.
+ * Hoja Inscripciones usa el mismo encabezado que la API pública.
+ */
+
+const ENCABEZADOS_INSCRIPCIONES = [
+  'ID', 'ID de grupo', 'Fecha', 'Tipo', 'Nombres', 'Apellido paterno',
+  'Apellido materno', 'Código', 'Universidad', 'Facultad / Institución',
+  'DNI', 'Celular', 'Voucher', 'Estado',
+  'MontoVerificado', 'TipoPago', 'NumeroTransaccion', 'MotivoRechazo',
+  // 2.º comprobante (doble pago). Se agrega AL FINAL: la migración solo
+  // añade columnas nuevas al final para no desalinear las existentes.
+  'Voucher2'
+];
+
+function abrirLibro_() {
+  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
+}
+
+function hojaInscripcionesValida_() {
+  const libro = abrirLibro_();
+  let hoja = libro.getSheetByName(CONFIG.HOJA_INSCRIPCIONES);
+  if (!hoja) hoja = libro.insertSheet(CONFIG.HOJA_INSCRIPCIONES);
+
+  if (hoja.getLastRow() === 0) {
+    hoja.getRange(1, 1, 1, ENCABEZADOS_INSCRIPCIONES.length)
+      .setValues([ENCABEZADOS_INSCRIPCIONES]);
+    hoja.setFrozenRows(1);
+    return hoja;
+  }
+
+  // Migración automática: si faltan columnas (p. ej. 'MontoVerificado',
+  // 'AprobadoPor'), se agregan al final sin tocar los datos existentes.
+  const nActual = hoja.getLastColumn();
+  const faltantes = ENCABEZADOS_INSCRIPCIONES.slice(nActual);
+  if (faltantes.length) {
+    const ultimaCol = nActual || 1;
+    faltantes.forEach(function (nombre, i) {
+      hoja.getRange(1, ultimaCol + 1 + i).setValue(nombre);
+    });
+  }
+
+  // Verifica que los encabezados ya presentes coincidan en orden.
+  const actual = hoja.getRange(1, 1, 1, nActual).getValues()[0];
+  const coincide = ENCABEZADOS_INSCRIPCIONES.slice(0, nActual).every(function (nombre, i) {
+    return actual[i] === nombre;
+  });
+  if (!coincide) {
+    throw new Error('La hoja Inscripciones no tiene el encabezado esperado. Revisa su fila 1.');
+  }
+  return hoja;
+}
+
+function leerTodo_(hoja) {
+  return hoja.getDataRange().getValues();
+}
\ No newline at end of file
