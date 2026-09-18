// Sección Organizadores: resumen por categoría + lista gestionable.
(function () {
  let datos = [];
  let filtroCategoria = '';

  const S = function (n) { return Number(n || 0).toLocaleString('es-PE'); };
  const esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function pintarResumen(resumen) {
    const caja = document.getElementById('orgResumen');
    let html = '<div class="resumen-minigrid">';
    html +=
      '<div class="mini-resumen"><span class="mini-numero">' + S(resumen.total.cantidad) + '</span><span class="mini-etiqueta">Total</span></div>' +
      '<div class="mini-resumen miniaprobado"><span class="mini-numero">' + S(resumen.total.conId) + '</span><span class="mini-etiqueta">Con ID</span></div>' +
      '<div class="mini-resumen minipendiente"><span class="mini-numero">' + S(resumen.total.sinId) + '</span><span class="mini-etiqueta">Sin ID</span></div>';
    html += '</div>';

    if (resumen.categorias.length) {
      html += '<h3 class="resumen-grupo-titulo" style="margin-top:22px">Por categoría</h3>';
      html += '<div class="resumen-minigrid">';
      resumen.categorias.forEach(function (c) {
        html +=
          '<div class="mini-resumen"><span class="mini-numero">' + S(c.cantidad) + '</span>' +
          '<span class="mini-etiqueta">' + esc(c.categoria) + '</span>' +
          '</div>';
      });
      html += '</div>';
    }
    caja.innerHTML = html;
  }

  function filtrar() {
    return filtroCategoria
      ? datos.filter(function (o) { return o.comision === filtroCategoria; })
      : datos;
  }

  function pintarTabla() {
    const tb = document.getElementById('tabla-organizadores');
    const filas = filtrar();
    if (!filas.length) {
      tb.innerHTML = '<tr><td colspan="7">Aún no hay organizadores' + (filtroCategoria ? ' en esta categoría.' : ' registrados.') + '</td></tr>';
      return;
    }
    tb.innerHTML = filas.map(function (o) {
      return '<tr>' +
        '<td>' + (o.id || '<button class="btn-secundario btn-chico" data-dni="' + esc(o.dni) + '">Asignar ID</button>') + '</td>' +
        '<td>' + esc(o.nombre) + '</td><td>' + esc(o.codigo || '—') + '</td>' +
        '<td>' + esc(o.dni) + '</td><td>' + esc(o.celular || '—') + '</td>' +
        '<td>' + esc(o.comision) + '</td>' +
        '<td><button class="btn-secundario btn-chico btn-cat" data-dni="' + esc(o.dni) + '" data-actual="' + esc(o.comision) + '">Categoría</button></td>' +
      '</tr>';
    }).join('');

    tb.querySelectorAll('button[data-dni]').forEach(function (btn) {
      if (btn.classList.contains('btn-cat')) return;
      btn.addEventListener('click', async function () {
        const r2 = await apiLlamada('asignarIdOrganizador', { dni: btn.getAttribute('data-dni') });
        alert(r2.ok ? 'ID asignado: ' + r2.id : (r2.mensaje || 'Error'));
        if (r2.ok) cargar();
      });
    });

    tb.querySelectorAll('.btn-cat').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const dni = btn.getAttribute('data-dni');
        const actual = btn.getAttribute('data-actual');
        const cats = categorias();
        const lista = cats.map(function (c, i) { return (i + 1) + '. ' + c; }).join('\n');
        const elegida = prompt(
          'Categoría actual: ' + actual +
          '\n\nElige escribiendo el número, pega el nombre o escribe una nueva:\n' + lista,
          actual
        );
        if (elegida === null || !elegida.trim()) return;
        const texto = elegida.trim();
        const num = parseInt(texto, 10);
        const valor = (num >= 1 && num <= cats.length) ? cats[num - 1] : texto;
        if (valor === actual) return;
        const r2 = await apiLlamada('actualizarOrganizador', { dni: dni, campo: 'comision', valor: valor });
        alert(r2.ok ? 'Categoría actualizada.' : (r2.mensaje || 'Error'));
        if (r2.ok) cargar();
      });
    });
  }

  function categorias() {
    const set = [];
    datos.forEach(function (o) { if (set.indexOf(o.comision) === -1) set.push(o.comision); });
    return set.sort();
  }

  function pintarFiltro() {
    const sel = document.getElementById('filtroCategoria');
    if (sel.innerHTML) return;
    let html = '<option value="">Todas las categorías</option>';
    categorias().forEach(function (c) {
      html += '<option value="' + esc(c) + '"' + (c === filtroCategoria ? ' selected' : '') + '>' + esc(c) + '</option>';
    });
    sel.innerHTML = html;
    sel.addEventListener('change', function () {
      filtroCategoria = sel.value;
      pintarTabla();
    });
  }

  async function cargar() {
    const cont = document.getElementById('seccion-organizadores');
    cont.innerHTML =
      '<h2 class="seccion-titulo">Organizadores</h2>' +
      '<p class="seccion-sub">Comité: gestión por categorías y asignación de IDs</p>' +
      '<div id="orgResumen"></div>' +
      '<div class="barra-acciones" style="align-items:end">' +
        '<label class="campo"><span>Categoría</span><select id="filtroCategoria"></select></label>' +
      '</div>' +
      '<div class="tabla-envoltorio">' +
        '<table class="tabla">' +
          '<thead><tr><th>ID</th><th>Nombre</th><th>Código</th><th>DNI</th><th>Celular</th><th>Categoría</th><th>Acción</th></tr></thead>' +
          '<tbody id="tabla-organizadores"></tbody>' +
        '</table>' +
      '</div>';

    const tb = document.getElementById('tabla-organizadores');
    tb.innerHTML = '<tr><td colspan="7">Cargando…</td></tr>';

    const [rl, rr] = await Promise.all([
      apiLlamada('listarOrganizadores'),
      apiLlamada('resumenOrganizadores')
    ]);
    if (!rl.ok) { tb.innerHTML = '<tr><td colspan="7" style="color:var(--rojo)">' + (rl.mensaje || 'Error') + '</td></tr>'; return; }
    datos = rl.organizadores || [];
    pintarResumen(rr.ok ? rr.resumen : { total: { cantidad: datos.length, conId: 0, sinId: 0 }, categorias: [] });
    pintarFiltro();
    pintarTabla();
  }

  window.SeccionOrganizadores = { mostrar: cargar };
})();