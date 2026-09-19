// Sección Organizadores: resumen, gestión (agregar/editar/observación/eliminar).
(function () {
  let datos = [];
  let filtroCategoria = '';

  const S = function (n) { return Number(n || 0).toLocaleString('es-PE'); };
  const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function pintarResumen(resumen) {
    const caja = document.getElementById('orgResumen');
    let html = '<div class="resumen-minigrid">';
    html +=
      '<div class="mini-resumen"><span class="mini-numero">' + S(resumen.total.cantidad) + '</span><span class="mini-etiqueta">Total</span></div>' +
      '<div class="mini-resumen miniaprobado"><span class="mini-numero">' + S(resumen.total.activos) + '</span><span class="mini-etiqueta">Activos</span></div>' +
      '<div class="mini-resumen minipendiente"><span class="mini-numero">' + S(resumen.total.observacion) + '</span><span class="mini-etiqueta">En observación</span></div>' +
      '<div class="mini-resumen"><span class="mini-numero">' + S(resumen.total.conId) + '</span><span class="mini-etiqueta">Con ID</span></div>' +
      '<div class="mini-resumen mini-rechazado"><span class="mini-numero">' + S(resumen.total.sinId) + '</span><span class="mini-etiqueta">Sin ID</span></div>';
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

  function estadoChip(o) {
    const obs = String(o.estado).toLowerCase() === 'observacion';
    return obs
      ? '<span class="chip chip-pendiente">observación</span>'
      : '<span class="chip chip-aprobado">activo</span>';
  }

  function pintarTabla() {
    const tb = document.getElementById('tabla-organizadores');
    const filas = filtrar();
    if (!filas.length) {
      tb.innerHTML = '<tr><td colspan="8">Aún no hay organizadores' + (filtroCategoria ? ' en esta categoría.' : ' registrados.') + '</td></tr>';
      return;
    }
    tb.innerHTML = filas.map(function (o) {
      const obs = String(o.estado).toLowerCase() === 'observacion';
      return '<tr>' +
        '<td>' + (o.id || '<button class="btn-secundario btn-chico" data-asignar="' + esc(o.dni) + '">Asignar ID</button>') + '</td>' +
        '<td>' + esc(o.nombre) + '</td><td><button class="btn-secundario btn-chico" data-editar="' + esc(o.dni) + '">' + (o.codigo ? esc(o.codigo) : '+ Código') + '</button></td>' +
        '<td>' + esc(o.dni) + '</td><td>' + esc(o.celular || '—') + '</td>' +
        '<td><button class="btn-secundario btn-chico" data-cat="' + esc(o.dni) + '" data-actual="' + esc(o.comision) + '">' + esc(o.comision) + '</button></td>' +
        '<td>' + estadoChip(o) + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn-secundario btn-chico" data-obs="' + esc(o.dni) + '" data-nombre="' + esc(o.nombre) + '">' + (obs ? 'Activar' : 'Observación') + '</button> ' +
          '<button class="btn-peligro btn-chico" data-eliminar="' + esc(o.dni) + '" data-nombre="' + esc(o.nombre) + '">Eliminar</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    tb.querySelectorAll('[data-asignar]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const r = await apiLlamada('asignarIdOrganizador', { dni: btn.getAttribute('data-asignar') });
        alert(r.ok ? 'ID asignado: ' + r.id : (r.mensaje || 'Error'));
        if (r.ok) cargar();
      });
    });

    tb.querySelectorAll('[data-editar]').forEach(function (btn) {
      btn.addEventListener('click', function () { abrirEdicion(btn.getAttribute('data-editar')); });
    });

    tb.querySelectorAll('[data-cat]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const dni = btn.getAttribute('data-cat');
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
        const r = await apiLlamada('actualizarOrganizador', { dni: dni, campo: 'comision', valor: valor });
        alert(r.ok ? 'Categoría actualizada.' : (r.mensaje || 'Error'));
        if (r.ok) cargar();
      });
    });

    tb.querySelectorAll('[data-obs]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const dni = btn.getAttribute('data-obs');
        const esObs = btn.textContent === 'Activar';
        const nombre = btn.getAttribute('data-nombre');
        const msg = esObs
          ? '¿Activar al organizador "' + nombre + '" (pasar a Activo)?'
          : '¿Poner en observación a "' + nombre + '"?';
        if (!confirm(msg)) return;
        const r = await apiLlamada('cambiarEstadoOrganizador', { dni: dni, estado: esObs ? 'activo' : 'observacion' });
        alert(r.ok ? r.mensaje : (r.mensaje || 'Error'));
        if (r.ok) cargar();
      });
    });

    tb.querySelectorAll('[data-eliminar]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const dni = btn.getAttribute('data-eliminar');
        const nombre = btn.getAttribute('data-nombre');
        const motivo = prompt('Motivo de la eliminación de "' + nombre + '" (se moverá a la hoja "Eliminados Organizadores"):');
        if (motivo === null) return;
        if (!motivo.trim()) { alert('Indica un motivo.'); return; }
        if (!confirm('¿Mover a Eliminados? Se borrará del registro de organizadores.')) return;
        const r = await apiLlamada('eliminarOrganizador', { dni: dni, motivo: motivo.trim() });
        alert(r.ok ? r.mensaje : (r.mensaje || 'Error'));
        if (r.ok) cargar();
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

  function abrirEdicion(dni) {
    const o = datos.find(function (x) { return x.dni === dni; });
    if (!o) return;
    const modal = document.getElementById('modal');
    modal.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo"><span>Editar organizador</span>' +
          '<button class="modal-cerrar" onclick="CerrarModal()">×</button></div>' +
        '<div class="detalle-grid">' +
          '<label class="campo"><span>Código</span><input id="o-codigo" value="' + esc(o.codigo) + '"></label>' +
          '<label class="campo"><span>Celular</span><input id="o-celular" value="' + esc(o.celular) + '"></label>' +
          '<label class="campo"><span>Categoría</span><input id="o-comision" value="' + esc(o.comision) + '"></label>' +
        '</div>' +
        '<div id="avisoOrg"></div>' +
        '<div class="barra-acciones" style="justify-content:flex-end">' +
          '<button class="btn-secundario" onclick="CerrarModal()">Cancelar</button>' +
          '<button class="btn-primario" id="btnGuardarOrg">Guardar</button>' +
        '</div>' +
      '</div>';

    document.getElementById('btnGuardarOrg').addEventListener('click', async function () {
      const g = document.getElementById;
      const cuerpo = { dni: dni, campo: 'comision', valor: g('o-comision').value.trim() };
      let r = await apiLlamada('actualizarOrganizador', cuerpo);
      const regs = [
        ['codigo', 'o-codigo'],
        ['celular', 'o-celular']
      ];
      for (let i = 0; i < regs.length; i++) {
        const rc = await apiLlamada('actualizarOrganizador', { dni: dni, campo: regs[i][0], valor: g(regs[i][1]).value.trim() });
        if (!rc.ok) r = rc;
      }
      const aviso = document.getElementById('avisoOrg');
      aviso.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
      if (r.ok) setTimeout(function () { CerrarModal(); cargar(); }, 700);
    });

    modal.classList.remove('oculto');
  }

  function abrirNuevo() {
    const modal = document.getElementById('modal');
    modal.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo"><span>Nuevo organizador (registro manual)</span>' +
          '<button class="modal-cerrar" onclick="CerrarModal()">×</button></div>' +
        '<div class="detalle-grid">' +
          '<label class="campo"><span>Nombres *</span><input id="n-nombres"></label>' +
          '<label class="campo"><span>Apellido paterno</span><input id="n-app"></label>' +
          '<label class="campo"><span>Apellido materno</span><input id="n-apm"></label>' +
          '<label class="campo"><span>Código</span><input id="n-codigo"></label>' +
          '<label class="campo"><span>DNI *</span><input id="n-dni" maxlength="8"></label>' +
          '<label class="campo"><span>Celular</span><input id="n-celular"></label>' +
          '<label class="campo"><span>Categoría</span><input id="n-comision" value="' + (categorias()[0] || 'Por definir') + '"></label>' +
        '</div>' +
        '<div id="avisoNuevoOrg"></div>' +
        '<div class="barra-acciones" style="justify-content:flex-end">' +
          '<button class="btn-secundario" onclick="CerrarModal()">Cancelar</button>' +
          '<button class="btn-primario" id="btnGuardarNuevoOrg">Registrar</button>' +
        '</div>' +
      '</div>';

    document.getElementById('btnGuardarNuevoOrg').addEventListener('click', async function () {
      const g = document.getElementById;
      const datos = {
        nombres: g('n-nombres').value.trim(),
        apellidoPaterno: g('n-app').value.trim(),
        apellidoMaterno: g('n-apm').value.trim(),
        codigo: g('n-codigo').value.trim(),
        dni: g('n-dni').value.trim(),
        celular: g('n-celular').value.trim(),
        comision: g('n-comision').value.trim()
      };
      const r = await apiLlamada('agregarOrganizador', { datos: datos });
      const aviso = document.getElementById('avisoNuevoOrg');
      aviso.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
      if (r.ok) setTimeout(function () { CerrarModal(); cargar(); }, 700);
    });

    modal.classList.remove('oculto');
  }

  async function cargar() {
    const cont = document.getElementById('seccion-organizadores');
    cont.innerHTML =
      '<h2 class="seccion-titulo">Organizadores</h2>' +
      '<p class="seccion-sub">Comité: gestión por categorías, estados y asignación de IDs</p>' +
      '<div id="orgResumen"></div>' +
      '<div class="barra-acciones" style="align-items:end">' +
        '<label class="campo"><span>Categoría</span><select id="filtroCategoria"></select></label>' +
        '<button class="btn-primario" id="btnNuevoOrg">+ Agregar organizador</button>' +
      '</div>' +
      '<div class="tabla-envoltorio">' +
        '<table class="tabla">' +
          '<thead><tr><th>ID</th><th>Nombre</th><th>Código</th><th>DNI</th><th>Celular</th><th>Categoría</th><th>Estado</th><th>Acciones</th></tr></thead>' +
          '<tbody id="tabla-organizadores"></tbody>' +
        '</table>' +
      '</div>';

    document.getElementById('btnNuevoOrg').addEventListener('click', abrirNuevo);

    const tb = document.getElementById('tabla-organizadores');
    tb.innerHTML = '<tr><td colspan="8">Cargando…</td></tr>';

    const [rl, rr] = await Promise.all([
      apiLlamada('listarOrganizadores'),
      apiLlamada('resumenOrganizadores')
    ]);
    if (!rl.ok) { tb.innerHTML = '<tr><td colspan="8" style="color:var(--rojo)">' + (rl.mensaje || 'Error') + '</td></tr>'; return; }
    datos = rl.organizadores || [];
    pintarResumen(rr.ok ? rr.resumen : { total: { cantidad: datos.length, conId: 0, sinId: 0, activos: 0, observacion: 0 }, categorias: [] });
    pintarFiltro();
    pintarTabla();
  }

  window.SeccionOrganizadores = { mostrar: cargar };
})();