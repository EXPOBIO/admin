// Sección Inscripciones: tabla con filtros, paginación y modal de detalle.
(function () {
  const estado = { filtro: '', tipo: '', busqueda: '', pagina: 1, tamano: 20, vista: 'todos' };

  const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  async function cargar() {
    const cont = document.getElementById('seccion-inscripciones');
    cont.innerHTML =
      '<h2 class="seccion-titulo">Inscripciones</h2>' +
      '<p class="seccion-sub">Revisa y aprueba o rechaza cada inscripción</p>' +

      '<div id="insResumenTop"></div>' +

      '<div class="barra-acciones" style="margin-top:18px">' +
        '<label class="campo"><select id="f-por-estado">' +
          '<option value="">Todos los estados</option>' +
          '<option value="pendiente">Pendiente</option>' +
          '<option value="aprobado">Aprobado</option>' +
          '<option value="rechazado">Rechazado</option>' +
        '</select></label>' +
        '<label class="campo"><select id="f-vista">' +
          '<option value="todos">Todos (cada persona)</option>' +
          '<option value="grupos">Grupos de 10 (agrupados)</option>' +
        '</select></label>' +
        '<label class="campo"><select id="f-por-tipo">' +
          '<option value="">Todos los tipos</option>' +
          '<option value="Estudiante">Estudiante</option>' +
          '<option value="Grupo10">Grupo de 10</option>' +
          '<option value="Egresado">Egresado</option>' +
        '</select></label>' +
        '<label class="campo"><input type="search" id="f-busqueda" placeholder="Nombre, DNI, código…"></label>' +
        '<button class="btn-primario" id="btnDescargar">Exportar CSV</button>' +
        '<button class="btn-primario" id="btnNuevo">+ Nueva inscripción</button>' +
      '</div>' +

      '<div class="tabla-envoltorio">' +
        '<table class="tabla">' +
          '<thead><tr>' +
            '<th>ID</th><th>Fecha</th><th>Tipo</th><th>Nombres</th>' +
            '<th>Código</th><th>Universidad</th><th>DNI</th><th>Estado</th>' +
          '</tr></thead>' +
          '<tbody id="tabla-inscripciones"></tbody>' +
        '</table>' +
      '</div>' +

      '<div class="paginacion" id="paginacion"></div>';

    document.getElementById('f-por-estado').addEventListener('change', function () { estado.filtro = this.value; estado.pagina = 1; pintar(); });
    document.getElementById('f-vista').addEventListener('change', function () { estado.vista = this.value; estado.pagina = 1; pintar(); });
    document.getElementById('f-por-tipo').addEventListener('change', function () { estado.tipo = this.value; estado.pagina = 1; pintar(); });
    document.getElementById('f-busqueda').addEventListener('input', function () { estado.busqueda = this.value; estado.pagina = 1; pintar(); });
    document.getElementById('btnDescargar').addEventListener('click', descargarCsv);
    document.getElementById('btnNuevo').addEventListener('click', abrirNuevaInscripcion);

    await Promise.all([pintarResumenTop(), pintar()]);
  }

  async function pintarResumenTop() {
    const caja = document.getElementById('insResumenTop');
    if (!caja) return;

    const r = await apiLlamada('resumen');
    if (!r.ok) { caja.innerHTML = ''; return; }

    const s = r.resumen;
    const e = s.porEstado || {};
    const mini = function (num, etiqueta, cls, dinero) {
      return '<div class="mini-resumen ' + (cls || '') + '">' +
        '<span class="mini-numero">' + Number(num || 0).toLocaleString('es-PE') + '</span>' +
        '<span class="mini-etiqueta">' + etiqueta + '</span>' +
        '</div>';
    };

    caja.innerHTML =
      '<div class="resumen-minigrid">' +
        mini((e.aprobado || {}).personas, 'Aprobados', 'miniaprobado') +
        mini((e.pendiente || {}).personas, 'Pendientes', 'minipendiente') +
        mini((e.rechazado || {}).personas, 'Rechazados', 'mini-rechazado') +
        mini(s.total, 'Inscripciones', '') +
        mini((s.porTipo && s.porTipo.Grupo10) || 0, 'Grupos de 10', 'minigrupo') +
        mini(s.dinero && s.dinero.total, 'Verificado (S/)', 'miniaprobado') +
      '</div>';
  }

  async function pintar() {
    const tb = document.getElementById('tabla-inscripciones');
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="8">Cargando…</td></tr>';

    const r = await apiLlamada('listarInscripciones', { estado: estado.filtro, tipo: estado.tipo, busqueda: estado.busqueda, pagina: estado.pagina, tamano: estado.tamano, vista: estado.vista });
    if (!r.ok) { tb.innerHTML = '<tr><td colspan="8" style="color:var(--rojo)">' + (r.mensaje || 'Error') + '</td></tr>'; return; }

    if (!r.inscripciones.length) { tb.innerHTML = '<tr><td colspan="8">No hay inscripciones.</td></tr>'; return; }

    const chips = { pendiente: 'chip-pendiente', aprobado: 'chip-aprobado', rechazado: 'chip-rechazado' };

    tb.innerHTML = r.inscripciones.map(function (i) {
      const chip = chips[i.estado.toLowerCase()] || 'chip-pendiente';
      const fecha = i.fecha ? new Date(i.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) : '—';
      const nombre = (i.nombres || '') + ' ' + (i.apellidos || '');
      const tipoCelda = i.esGrupo
        ? 'Grupo de 10 <span class="chip chip-aprobado" title="Integrantes">×' + i.cantidad + '</span>'
        : i.tipo;
      return '<tr class="fila-datos" data-id="' + i.id + '" data-grupo="' + (i.grupoId || '') + '" data-esgrupo="' + (i.esGrupo ? '1' : '0') + '">' +
        '<td>' + (i.esGrupo ? i.grupoId : i.id) + '</td><td>' + fecha + '</td><td>' + tipoCelda + '</td>' +
        '<td>' + nombre + '</td><td>' + (i.codigo || '—') + '</td>' +
        '<td>' + (i.universidad || '—') + '</td><td>' + (i.dni || '—') + '</td>' +
        '<td><span class="chip ' + chip + '">' + i.estado + '</span></td>' +
      '</tr>';
    }).join('');

    // Reasignar click con delegación limpia
    tb.querySelectorAll('tr.fila-datos').forEach(function (tr) {
      tr.addEventListener('click', function () {
        abrirDetalle(tr.getAttribute('data-id'), tr.getAttribute('data-grupo'), tr.getAttribute('data-esgrupo') === '1');
      });
    });

    pintarPaginacion(r.total);
  }

  function pintarPaginacion(total) {
    const div = document.getElementById('paginacion');
    const totalPaginas = Math.max(1, Math.ceil(total / estado.tamano));
    div.textContent = total + ' inscripciones · página ' + estado.pagina + ' de ' + totalPaginas;
    const prev = document.createElement('button');
    prev.className = 'btn-secundario btn-chico';
    prev.textContent = '‹ Anterior';
    prev.disabled = estado.pagina <= 1;
    prev.onclick = function () { estado.pagina--; pintar(); };
    const next = document.createElement('button');
    next.className = 'btn-secundario btn-chico';
    next.textContent = 'Siguiente ›';
    next.disabled = estado.pagina >= totalPaginas;
    next.style.marginLeft = '8px';
    next.onclick = function () { estado.pagina++; pintar(); };
    div.append(prev, next);
  }

  // ---------- Modal de detalle ----------

  async function abrirDetalle(id, grupoId, esGrupo) {
    const body = esGrupo && grupoId ? { grupoId: grupoId } : { id: id };
    const r = await apiLlamada('obtenerInscripcion', body);
    if (!r.ok) return notificar(r.mensaje || 'No se pudo abrir.');

    const i = r.inscripcion;
    const modal = document.getElementById('modal');
    const voucher = i.Voucher
      ? '<div class="voucher-caja"><img class="voucher-img" src="' + (r.voucherBase64 ? 'data:' + r.voucherBase64.mimeType + ';base64,' + r.voucherBase64.base64 : i.Voucher) + '" alt="Voucher"></div>'
      : '<div class="alerta alerta-error">Sin voucher registrado.</div>';

    const campos = [
      ['Nombres', i.Nombres], ['Apellidos', (i['Apellido paterno'] || '') + ' ' + (i['Apellido materno'] || '')],
      ['Tipo', i.Tipo],
      ['Universidad', i.Universidad || '—'], ['Facultad / Institución', i['Facultad / Institución'] || '—'],
      ['DNI', i.DNI || '—'], ['Celular', i.Celular || '—'],
      ['ID de grupo', i['ID de grupo'] || '—'], ['Fecha', i.Fecha ? new Date(i.Fecha).toLocaleString('es-PE') : '—'],
      ['Monto verificado', i.MontoVerificado || '—'], ['Tipo de pago', i.TipoPago || '—'],
      ['N° transacción', i.NumeroTransaccion || '—']
    ];

    const chip = 'chip-' + String(i.Estado).toLowerCase();
    const integrantesHtml = r.miembros && r.miembros.length
      ? '<h3 class="seccion-titulo" style="font-size:15px;margin-top:22px">Integrantes del grupo (' + r.miembros.length + ')</h3>' +
        '<div class="tabla-envoltorio" style="margin-top:10px"><table class="tabla">' +
          '<thead><tr><th>Nombres</th><th>DNI</th><th>Código</th><th>Estado</th></tr></thead><tbody>' +
          r.miembros.map(function (m) {
            return '<tr><td>' + (m.Nombres || '') + ' ' + (m.ApellidoPaterno || '') + ' ' + (m.ApellidoMaterno || '') + '</td>' +
              '<td>' + (m.DNI || '—') + '</td><td>' + (m.Código || '—') + '</td>' +
              '<td><span class="chip chip-' + String(m.Estado).toLowerCase() + '">' + m.Estado + '</span></td></tr>';
          }).join('') +
          '</tbody></table></div>'
      : '';

    const verGrupo =
      r.perteneceGrupo && r.grupoId
        ? '<button class="btn-secundario" id="btnVerGrupo">Ver integrantes del grupo (' + (r.miembros ? r.miembros.length : '') + ')</button> '
        : '';

    const cajaMiembros = r.perteneceGrupo
      ? '<div id="grupoMiembros" style="display:none">' + integrantesHtml + '</div>'
      : integrantesHtml;

    modal.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' +
          '<span>' + (r.esGrupo ? 'Grupo de 10 <code>' + i.ID + '</code>' : 'Inscripción <code>' + i.ID + '</code>') + ' · <span class="chip ' + chip + '">' + i.Estado + '</span></span>' +
          '<button class="modal-cerrar" onclick="CerrarModal()">×</button>' +
        '</div>' +

        voucher +
        cajaMiembros +

        '<div class="detalle-grid">' +
          campos.map(function (c) { return '<div class="detalle-campo"><div class="k">' + c[0] + '</div><div class="v">' + (c[1] || '—') + '</div></div>'; }).join('') +
        '</div>' +

        '<div id="detalleAcciones" class="barra-acciones">' +
          '<div style="display:flex;gap:10px;align-items:center">' +
            '<button class="btn-secundario" id="btnAprobar">Aprobar</button>' +
            '<button class="btn-peligro" id="btnRechazar">Rechazar</button>' +
            verGrupo +
            '<button class="btn-peligro" id="btnEliminar">Eliminar</button>' +
            (i.ID ? '<button class="btn-secundario" id="btnEditar">Editar datos</button>' : '') +
          '</div>' +
        '</div>' +

        '<div id="avisoAccion"></div>' +
      '</div>';

    const targetId = r.esGrupo ? (i.ID || '') : i.ID;
    document.getElementById('btnAprobar').addEventListener('click', function () { aplicarEstado(targetId, r.grupoId, 'aprobado'); });
    document.getElementById('btnRechazar').addEventListener('click', function () {
      aplicarEstado(targetId, r.grupoId, 'rechazado');
    });
    document.getElementById('btnEliminar').addEventListener('click', async function () {
      const motivo = prompt('Motivo de la eliminación (se moverá a la hoja Eliminados):');
      if (motivo === null) return;
      if (!motivo.trim()) { alert('Indica un motivo.'); return; }
      if (!confirm('¿Mover a Eliminados? Esta acción borrará la fila de Inscripciones.')) return;
      eliminarInscripcion(targetId, r.grupoId, motivo.trim());
    });

    if (document.getElementById('btnVerGrupo')) {
      document.getElementById('btnVerGrupo').addEventListener('click', function () {
        const caja = document.getElementById('grupoMiembros');
        if (!caja) return;
        const visible = caja.style.display !== 'none';
        caja.style.display = visible ? 'none' : 'block';
        this.textContent = visible
          ? 'Ver integrantes del grupo (' + (r.miembros ? r.miembros.length : '') + ')'
          : 'Ocultar integrantes';
      });
    }

    if (document.getElementById('btnEditar')) {
      document.getElementById('btnEditar').addEventListener('click', function () {
        abrirEdicion(i.ID, r.grupoId, i);
      });
    }

    modal.classList.remove('oculto');
  }

  // ---------- Edición de datos ----------

  async function abrirEdicion(id, grupoId, i) {
    const modal = document.getElementById('modal');
    modal.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo"><span>Editar inscripción <code>' + (i.ID || '') + '</code></span>' +
          '<button class="modal-cerrar" onclick="CerrarModal()">×</button></div>' +
        '<p class="seccion-sub">Corrige datos mal llenados (código, universidad, pago…).</p>' +
        '<div class="detalle-grid">' +
          '<label class="campo"><span>Nombres</span><input id="e-nombres" value="' + esc(i.Nombres || '') + '"></label>' +
          '<label class="campo"><span>Apellido paterno</span><input id="e-app" value="' + esc(i['Apellido paterno'] || '') + '"></label>' +
          '<label class="campo"><span>Apellido materno</span><input id="e-apm" value="' + esc(i['Apellido materno'] || '') + '"></label>' +
          '<label class="campo"><span>Código</span><input id="e-codigo" value="' + esc(i.Código || '') + '"></label>' +
          '<label class="campo"><span>Universidad</span><input id="e-universidad" value="' + esc(i.Universidad || '') + '"></label>' +
          '<label class="campo"><span>Facultad / Institución</span><input id="e-facultad" value="' + esc(i['Facultad / Institución'] || '') + '"></label>' +
          '<label class="campo"><span>DNI</span><input id="e-dni" maxlength="8" value="' + esc(i.DNI || '') + '"></label>' +
          '<label class="campo"><span>Celular</span><input id="e-celular" value="' + esc(i.Celular || '') + '"></label>' +
          '<label class="campo"><span>Monto verificado (S/.)</span><input id="e-monto" value="' + esc(i.MontoVerificado || '') + '"></label>' +
          '<label class="campo"><span>Tipo de pago</span><input id="e-pago" value="' + esc(i.TipoPago || '') + '"></label>' +
          '<label class="campo"><span>N° transacción</span><input id="e-nro" value="' + esc(i.NumeroTransaccion || '') + '"></label>' +
        '</div>' +
        '<div id="avisoEdit"></div>' +
        '<div class="barra-acciones" style="justify-content:flex-end">' +
          '<button class="btn-secundario" onclick="CerrarModal()">Cancelar</button>' +
          '<button class="btn-primario" id="btnGuardarEdit">Guardar cambios</button>' +
        '</div>' +
      '</div>';

    document.getElementById('btnGuardarEdit').addEventListener('click', function () { guardarEdicion(id, grupoId); });
    modal.classList.remove('oculto');
  }

  async function guardarEdicion(id, grupoId) {
    const g = document.getElementById;
    const campos = {
      nombres: g('e-nombres').value.trim(),
      apellidoPaterno: g('e-app').value.trim(),
      apellidoMaterno: g('e-apm').value.trim(),
      codigo: g('e-codigo').value.trim(),
      universidad: g('e-universidad').value.trim(),
      facultadInstitucion: g('e-facultad').value.trim(),
      dni: g('e-dni').value.trim(),
      celular: g('e-celular').value.trim(),
      montoVerificado: g('e-monto').value.trim(),
      tipoPago: g('e-pago').value.trim(),
      numeroTransaccion: g('e-nro').value.trim()
    };

    const btn = document.getElementById('btnGuardarEdit');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    const r = await apiLlamada('editarInscripcion', { id: id, grupoId: grupoId, campos: campos });
    const aviso = document.getElementById('avisoEdit');
    aviso.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
    if (r.ok) {
      setTimeout(function () { CerrarModal(); pintar(); pintarResumenTop(); actualizarResumenSiVisible(); }, 700);
    } else {
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
    }
  }

  async function eliminarInscripcion(id, grupoId, motivo) {
    const btnEliminar = document.getElementById('btnEliminar');
    btnEliminar.disabled = true;
    btnEliminar.textContent = 'Eliminando…';
    const r = await apiLlamada('eliminarInscripcion', { id: id, grupoId: grupoId, motivo: motivo });
    const aviso = document.getElementById('avisoAccion');
    aviso.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
    if (r.ok) {
      setTimeout(function () { CerrarModal(); pintar(); pintarResumenTop(); actualizarResumenSiVisible(); }, 700);
    } else {
      btnEliminar.disabled = false;
      btnEliminar.textContent = 'Eliminar';
    }
  }

  async function aplicarEstado(id, grupoId, estadoNuevo) {
    const btnAprobar = document.getElementById('btnAprobar');
    const btnRechazar = document.getElementById('btnRechazar');
    btnAprobar.disabled = btnRechazar.disabled = true;
    const esAprobar = estadoNuevo === 'aprobado';
    btnAprobar.textContent = esAprobar ? 'Aprobando…' : 'Aprobar';
    btnRechazar.textContent = esAprobar ? 'Rechazar' : 'Rechazando…';

    const r = await apiLlamada('cambiarEstado', { id: id, grupoId: grupoId, estado: estadoNuevo });
    const aviso = document.getElementById('avisoAccion');
    aviso.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';

    if (r.ok) {
      setTimeout(function () { CerrarModal(); pintar(); pintarResumenTop(); actualizarResumenSiVisible(); }, 700);
    } else {
      btnAprobar.disabled = btnRechazar.disabled = false;
      btnAprobar.textContent = 'Aprobar';
      btnRechazar.textContent = 'Rechazar';
    }
  }

  // ---------- Registro manual ----------

  async function abrirNuevaInscripcion() {
    const modal = document.getElementById('modal');
    modal.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo"><span>Nueva inscripción (registro manual)</span>' +
          '<button class="modal-cerrar" onclick="CerrarModal()">×</button></div>' +
        '<div class="detalle-grid">' +
          '<label class="campo" style="grid-column:1/-1"><span>Tipo *</span><select id="m-tipo">' +
            '<option value="Estudiante">Estudiante</option>' +
            '<option value="Grupo10">Grupo de 10</option>' +
            '<option value="Egresado">Egresado</option></select></label>' +

          '<label class="campo" id="w-nombres"><span>Nombres *</span><input id="m-nombres"></label>' +
          '<label class="campo" id="w-app"><span>Apellido paterno</span><input id="m-app"></label>' +
          '<label class="campo" id="w-apm"><span>Apellido materno</span><input id="m-apm"></label>' +
          '<label class="campo" id="w-dni"><span>DNI *</span><input id="m-dni" maxlength="8"></label>' +
          '<label class="campo" id="w-celular"><span>Celular</span><input id="m-celular"></label>' +
          '<label class="campo" id="w-codigo" style="display:none"><span>Código (6 díg.)</span><input id="m-codigo" maxlength="6"></label>' +
          '<label class="campo" id="w-universidad" style="display:none"><span>Universidad</span><input id="m-universidad"></label>' +
          '<label class="campo" id="w-facultad" style="display:none"><span>Facultad</span><input id="m-facultad" value="Ciencias Biológicas"></label>' +
          '<label class="campo" id="w-institucion" style="display:none"><span>Institución *</span><input id="m-institucion" placeholder="Ej. Colegio / Instituto"></label>' +

          '<div id="m-grupo-caja" style="display:none;grid-column:1/-1">' +
            '<h3 class="seccion-titulo" style="font-size:14px;margin:14px 0 8px">Integrantes del grupo (10) · un solo voucher</h3>' +
            '<div class="tabla-envoltorio"><table class="tabla">' +
              '<thead><tr><th>N°</th><th>Nombres</th><th>Ap. paterno</th><th>Ap. materno</th><th>Universidad</th><th>Facultad</th><th>Código</th><th>DNI</th><th>Celular</th></tr></thead>' +
              '<tbody id="tbody-integrantes"></tbody>' +
            '</table></div>' +
          '</div>' +

          '<label class="campo"><span>ID de grupo</span><input id="m-grupo"></label>' +
          '<label class="campo"><span>Monto verificado (S/.)</span><input id="m-monto"></label>' +
          '<label class="campo"><span>Tipo de pago</span><input id="m-pago"></label>' +
          '<label class="campo"><span>N° transacción</span><input id="m-nro"></label>' +
          '<label class="campo"><span>Voucher (URL de Drive o archivo)</span><input type="file" id="m-voucher" accept="image/*"></label>' +
        '</div>' +
        '<div id="avisoNuevo"></div>' +
        '<div class="barra-acciones" style="justify-content:flex-end">' +
          '<button class="btn-secundario" onclick="CerrarModal()">Cancelar</button>' +
          '<button class="btn-primario" id="btnGuardarNuevo">Registrar</button>' +
        '</div>' +
      '</div>';

    renderIntegrantes();
    aplicarTipo('Estudiante');

    document.getElementById('m-tipo').addEventListener('change', function () { aplicarTipo(this.value); });
    document.getElementById('btnGuardarNuevo').addEventListener('click', guardarNuevaInscripcion);
    modal.classList.remove('oculto');
  }

  function aplicarTipo(t) {
    const esGrupo = t === 'Grupo10';
    const esEst = t === 'Estudiante';
    const esEgr = t === 'Egresado';

    ['w-nombres', 'w-app', 'w-apm', 'w-dni', 'w-celular'].forEach(function (id) {
      document.getElementById(id).style.display = esGrupo ? 'none' : '';
    });
    ['w-codigo', 'w-universidad', 'w-facultad'].forEach(function (id) {
      document.getElementById(id).style.display = esEst ? '' : 'none';
    });
    document.getElementById('w-institucion').style.display = esEgr ? '' : 'none';
    document.getElementById('m-grupo-caja').style.display = esGrupo ? 'block' : 'none';
  }

  function renderIntegrantes() {
    const tbody = document.getElementById('tbody-integrantes');
    if (!tbody) return;
    let html = '';
    for (let i = 0; i < 10; i++) {
      html +=
        '<tr>' +
          '<td>' + (i + 1) + '</td>' +
          '<td><input id="gi-' + i + '-nombres"></td>' +
          '<td><input id="gi-' + i + '-app"></td>' +
          '<td><input id="gi-' + i + '-apm"></td>' +
          '<td><input id="gi-' + i + '-uni" placeholder="UNSAAC / Otra"></td>' +
          '<td><input id="gi-' + i + '-fac" value="Ciencias Biológicas"></td>' +
          '<td><input id="gi-' + i + '-cod" maxlength="6"></td>' +
          '<td><input id="gi-' + i + '-dni" maxlength="8"></td>' +
          '<td><input id="gi-' + i + '-cel"></td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
  }

  async function guardarNuevaInscripcion() {
    const g = document.getElementById;
    const tipo = g('m-tipo').value;
    const archivo = g('m-voucher').files[0];
    let voucherBase64 = '';
    if (archivo) {
      try { voucherBase64 = await leerBase64(archivo); }
      catch (e) { return notificar('No se pudo leer el voucher.'); }
    }

    const base = {
      tipo: tipo,
      grupoId: g('m-grupo').value.trim(),
      montoVerificado: g('m-monto').value.trim(),
      tipoPago: g('m-pago').value.trim(),
      numeroTransaccion: g('m-nro').value.trim(),
      voucher: voucherBase64
    };

    let datos;
    if (tipo === 'Grupo10') {
      const integrantes = [];
      for (let i = 0; i < 10; i++) {
        integrantes.push({
          dni: g('gi-' + i + '-dni').value.trim(),
          nombres: g('gi-' + i + '-nombres').value.trim(),
          apellidoPaterno: g('gi-' + i + '-app').value.trim(),
          apellidoMaterno: g('gi-' + i + '-apm').value.trim(),
          codigo: g('gi-' + i + '-cod').value.trim(),
          universidad: g('gi-' + i + '-uni').value.trim(),
          facultad: g('gi-' + i + '-fac').value.trim(),
          celular: g('gi-' + i + '-cel').value.trim()
        });
      }
      for (let i = 0; i < integrantes.length; i++) {
        if (!integrantes[i].dni || !integrantes[i].nombres) {
          const aviso = document.getElementById('avisoNuevo');
          aviso.innerHTML = '<div class="alerta alerta-error">Integrante N°' + (i + 1) + ': completa al menos DNI y Nombres.</div>';
          return;
        }
      }
      datos = Object.assign({ integrantes: integrantes }, base);
    } else {
      const esEgr = tipo === 'Egresado';
      datos = Object.assign({
        nombres: g('m-nombres').value.trim(),
        apellidoPaterno: g('m-app').value.trim(),
        apellidoMaterno: g('m-apm').value.trim(),
        dni: g('m-dni').value.trim(),
        celular: g('m-celular').value.trim(),
        codigo: esEgr ? '' : g('m-codigo').value.trim(),
        universidad: esEgr ? '' : g('m-universidad').value.trim(),
        facultadInstitucion: esEgr ? g('m-institucion').value.trim() : g('m-facultad').value.trim()
      }, base);
    }

    const btnGuardar = document.getElementById('btnGuardarNuevo');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Registrando…';

    const r = await apiLlamada('registrarManual', { datos: datos });
    const aviso = document.getElementById('avisoNuevo');
    aviso.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
    if (r.ok) {
      setTimeout(function () { CerrarModal(); pintar(); pintarResumenTop(); actualizarResumenSiVisible(); }, 800);
    } else {
      btnGuardar.disabled = false;
      btnGuardar.textContent = 'Registrar';
    }
  }

  function leerBase64(archivo) {
    return new Promise(function (resolve, reject) {
      const lector = new FileReader();
      lector.onload = function () { resolve(lector.result); };
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });
  }

  function descargarCsv() {
    apiLlamada('exportarInscritos').then(function (r) {
      if (!r.ok) return notificar(r.mensaje || 'No se pudo exportar.');
      const blob = new Blob([r.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inscripciones_expobio.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 500);
    });
  }

  window.SeccionInscripciones = { mostrar: cargar };
})();