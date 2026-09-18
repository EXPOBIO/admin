// Sección Resumen: tarjetas con contadores.
(function () {
  let cargado = false;

  async function cargar() {
    const cont = document.getElementById('seccion-resumen');
    cont.innerHTML =
      '<h2 class="seccion-titulo">Resumen</h2>' +
      '<p class="seccion-sub">Estado general de las inscripciones</p>' +
      '<div class="tarjetas-resumen">' +
        '<div class="tarjeta-resumen"><div class="numero" id="r-total">…</div><div class="etiqueta">Total</div></div>' +
        '<div class="tarjeta-resumen pendiente"><div class="numero" id="r-pendiente">…</div><div class="etiqueta">Pendientes</div></div>' +
        '<div class="tarjeta-resumen aprobado"><div class="numero" id="r-aprobado">…</div><div class="etiqueta">Aprobados</div></div>' +
        '<div class="tarjeta-resumen rechazado"><div class="numero" id="r-rechazado">…</div><div class="etiqueta">Rechazados</div></div>' +
      '</div>' +
      '<div id="resumenTipo"></div>';

    const r = await apiLlamada('resumen');
    if (!r.ok) { document.getElementById('resumenTipo').innerHTML = '<div class="alerta alerta-error">' + (r.mensaje || 'Error') + '</div>'; return; }

    const s = r.resumen;
    document.getElementById('r-total').textContent = s.total;
    document.getElementById('r-pendiente').textContent = s.pendiente;
    document.getElementById('r-aprobado').textContent = s.aprobado;
    document.getElementById('r-rechazado').textContent = s.rechazado;

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
    cargado = true;
  }

  window.SeccionResumen = {
    mostrar: function () {
      if (!cargado) cargar();
    }
  };
})();