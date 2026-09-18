// Sección Organizadores: lista con sus IDs asignados.
(function () {
  async function cargar() {
    const cont = document.getElementById('seccion-organizadores');
    cont.innerHTML =
      '<h2 class="seccion-titulo">Organizadores</h2>' +
      '<p class="seccion-sub">Composición del comité (IDs se asignan automáticamente al consultar)</p>' +
      '<div class="tabla-envoltorio">' +
        '<table class="tabla">' +
          '<thead><tr><th>ID</th><th>Nombre</th><th>Código</th><th>DNI</th><th>Celular</th><th>Comisión / Organizador</th></tr></thead>' +
          '<tbody id="tabla-organizadores"></tbody>' +
        '</table>' +
      '</div>';

    const tb = document.getElementById('tabla-organizadores');
    tb.innerHTML = '<tr><td colspan="6">Cargando…</td></tr>';

    const r = await apiLlamada('listarOrganizadores');
    if (!r.ok) { tb.innerHTML = '<tr><td colspan="6" style="color:var(--rojo)">' + (r.mensaje || 'Error') + '</td></tr>'; return; }
    if (!r.organizadores.length) { tb.innerHTML = '<tr><td colspan="6">Aún no hay organizadores registrados.</td></tr>'; return; }

    tb.innerHTML = r.organizadores.map(function (o) {
      return '<tr>' +
        '<td>' + (o.id || '<button class="btn-secundario btn-chico" data-dni="' + o.dni + '">Asignar ID</button>') + '</td>' +
        '<td>' + o.nombre + '</td><td>' + (o.codigo || '—') + '</td>' +
        '<td>' + o.dni + '</td><td>' + (o.celular || '—') + '</td>' +
        '<td>' + o.comision + '</td>' +
      '</tr>';
    }).join('');

    tb.querySelectorAll('button[data-dni]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const r2 = await apiLlamada('asignarIdOrganizador', { dni: btn.getAttribute('data-dni') });
        alert(r2.ok ? 'ID asignado: ' + r2.id : (r2.mensaje || 'Error'));
        if (r2.ok) cargar();
      });
    });
  }

  window.SeccionOrganizadores = { mostrar: cargar };
})();