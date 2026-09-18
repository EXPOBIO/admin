// Sección Precios: edición simple de categorías (universitario / público).
(function () {
  async function cargar() {
    const cont = document.getElementById('seccion-precios');
    cont.innerHTML =
      '<h2 class="seccion-titulo">Precios</h2>' +
      '<p class="seccion-sub">Define el costo por categoría</p>' +
      '<div class="tabla-envoltorio" style="max-width:520px">' +
        '<table class="tabla">' +
          '<thead><tr><th>Categoría</th><th>Universitario</th><th>Público</th><th></th></tr></thead>' +
          '<tbody id="tabla-precios"></tbody>' +
        '</table>' +
      '</div>' +
      '<div class="barra-acciones" style="margin-top:16px">' +
        '<label class="campo"><input type="text" id="nueva-categoria" placeholder="Nueva categoría"></label>' +
        '<label class="campo"><input type="number" id="nuevo-uni" placeholder="S/. universitario" min="0" step="1"></label>' +
        '<label class="campo"><input type="number" id="nuevo-pub" placeholder="S/. público" min="0" step="1"></label>' +
        '<button class="btn-primario" id="btnAgregarPrecio">Agregar</button>' +
      '</div>' +
      '<div id="avisoPrecios"></div>';

    document.getElementById('btnAgregarPrecio').addEventListener('click', agregar);

    await pintar();
  }

  async function pintar() {
    const tb = document.getElementById('tabla-precios');
    if (!tb) return;
    const r = await apiLlamada('obtenerPrecios');
    if (!r.ok) { tb.innerHTML = '<tr><td colspan="4" style="color:var(--rojo)">' + (r.mensaje || 'Error') + '</td></tr>'; return; }
    if (!r.precios.length) { tb.innerHTML = '<tr><td colspan="4">Sin precios definidos.</td></tr>'; return; }

    tb.innerHTML = r.precios.map(function (p) {
      return '<tr>' +
        '<td><input type="text" data-campo="categoria" value="' + String(p.categoria).replace(/"/g, '&quot;') + '" style="width:130px"></td>' +
        '<td><input type="number" min="0" step="1" data-campo="universitario" value="' + (p.universitario || '') + '" style="width:90px"></td>' +
        '<td><input type="number" min="0" step="1" data-campo="publico" value="' + (p.publico || '') + '" style="width:90px"></td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn-secundario btn-chico" data-guardar="' + p.fila + '">Guardar</button> ' +
          '<button class="btn-peligro btn-chico" data-eliminar="' + p.fila + '">×</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    tb.querySelectorAll('[data-guardar]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const tr = btn.closest('tr');
        const precio = {
          categoria: tr.querySelector('[data-campo="categoria"]').value.trim(),
          universitario: tr.querySelector('[data-campo="universitario"]').value,
          publico: tr.querySelector('[data-campo="publico"]').value
        };
        const r = await apiLlamada('actualizarPrecio', { fila: btn.getAttribute('data-guardar'), precio: precio });
        aviso(r);
        if (r.ok) pintar();
      });
    });

    tb.querySelectorAll('[data-eliminar]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!confirm('¿Eliminar este precio?')) return;
        const r = await apiLlamada('eliminarPrecio', { fila: btn.getAttribute('data-eliminar') });
        aviso(r);
        if (r.ok) pintar();
      });
    });
  }

  async function agregar() {
    const g = document.getElementById;
    const precio = {
      categoria: g('nueva-categoria').value.trim(),
      universitario: g('nuevo-uni').value,
      publico: g('nuevo-pub').value
    };
    if (!precio.categoria) return aviso({ ok: false, mensaje: 'Falta el nombre.' });
    const r = await apiLlamada('crearPrecio', { precio: precio });
    aviso(r);
    if (r.ok) {
      g('nueva-categoria').value = '';
      g('nuevo-uni').value = '';
      g('nuevo-pub').value = '';
      pintar();
    }
  }

  function aviso(r) {
    const div = document.getElementById('avisoPrecios');
    div.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
  }

  window.SeccionPrecios = { mostrar: cargar };
})();