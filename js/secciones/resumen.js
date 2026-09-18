// Sección Resumen: tarjetas con contadores + dinero.
(function () {
  let cargado = false;

  async function cargar() {
    const cont = document.getElementById('seccion-resumen');
    cont.innerHTML =
      '<h2 class="seccion-titulo">Resumen</h2>' +
      '<p class="seccion-sub">Estado general de las inscripciones y recaudación</p>' +
      '<div class="tarjetas-resumen">' +
        '<div class="tarjeta-resumen"><div class="numero" id="r-total">…</div><div class="etiqueta">Total</div></div>' +
        '<div class="tarjeta-resumen pendiente"><div class="numero" id="r-pendiente">…</div><div class="etiqueta">Pendientes</div></div>' +
        '<div class="tarjeta-resumen aprobado"><div class="numero" id="r-aprobado">…</div><div class="etiqueta">Aprobados</div></div>' +
        '<div class="tarjeta-resumen rechazado"><div class="numero" id="r-rechazado">…</div><div class="etiqueta">Rechazados</div></div>' +
        '<div class="tarjeta-resumen"><div class="numero" id="r-dinero">…</div><div class="etiqueta">Dinero aprobado</div></div>' +
      '</div>' +
      '<div id="resumenTipo"></div>' +
      '<div id="resumenPagos"></div>';

    const r = await apiLlamada('resumen');
    if (!r.ok) { document.getElementById('resumenTipo').innerHTML = '<div class="alerta alerta-error">' + (r.mensaje || 'Error') + '</div>'; return; }

    const s = r.resumen;
    document.getElementById('r-total').textContent = s.total;
    document.getElementById('r-pendiente').textContent = s.pendiente;
    document.getElementById('r-aprobado').textContent = s.aprobado;
    document.getElementById('r-rechazado').textContent = s.rechazado;
    document.getElementById('r-dinero').textContent = 'S/ ' + Number(s.dinero && s.dinero.total || 0).toLocaleString('es-PE');

    const tipos = Object.keys(s.porTipo || {});
    if (tipos.length) {
      const html = tipos.map(function (t) {
        const c = String(t).toLowerCase() === 'grupo10' ? 'pendiente' :
                  String(t).toLowerCase() === 'egresado' ? 'aprobado' : '';
        return '<div class="tarjeta-resumen ' + c + '"><div class="numero">' + s.porTipo[t] + '</div><div class="etiqueta">' + t + '</div></div>';
      }).join('');
      document.getElementById('resumenTipo').innerHTML =
        '<div class="tarjetas-resumen">' + html + '</div>';
    }

    // Desglose por tipo de pago.
    const pagos = s.porTipoPago || [];
    if (pagos.length) {
      document.getElementById('resumenPagos').innerHTML =
        '<h3 class="seccion-titulo" style="font-size:16px;margin-top:26px">Pagos (aprobados)</h3>' +
        '<div class="tabla-envoltorio" style="margin-top:14px">' +
          '<table class="tabla">' +
            '<thead><tr><th>Tipo de pago</th><th>Cantidad</th><th>Monto</th></tr></thead>' +
            '<tbody>' +
              pagos.map(function (p) {
                return '<tr><td>' + p.tipo + '</td><td>' + p.cantidad + '</td><td>S/ ' + Number(p.monto).toLocaleString('es-PE') + '</td></tr>';
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>';
    }
    cargado = true;
  }

  window.SeccionResumen = {
    mostrar: function () {
      if (!cargado) cargar();
    },
    refrescar: function () { cargar(); }
  };
})();