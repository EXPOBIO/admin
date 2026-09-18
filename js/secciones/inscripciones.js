// Sección Inscripciones: tabla con filtros, paginación y modal de detalle.
(function () {
  const estado = { filtro: '', tipo: '', busqueda: '', pagina: 1, tamano: 20 };

  async function cargar() {
    const cont = document.getElementById('seccion-inscripciones');
    cont.innerHTML =
      '<h2 class="seccion-titulo">Inscripciones</h2>' +
      '<p class="seccion-sub">Revisa y aprueba o rechaza cada inscripción</p>' +

      '<div class="barra-acciones">' +
        '<label class="campo"><select id="f-por-estado">' +
          '<option value="">Todos los estados</option>' +
          '<option value="pendiente">Pendiente</option>' +
          '<option value="aprobado">Aprobado</option>' +
          '<option value="rechazado">Rechazado</option>' +
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
    document.getElementById('f-por-tipo').addEventListener('change', function () { estado.tipo = this.value; estado.pagina = 1; pintar(); });
    document.getElementById('f-busqueda').addEventListener('input', function () { estado.busqueda = this.value; estado.pagina = 1; pintar(); });
    document.getElementById('btnDescargar').addEventListener('click', descargarCsv);
    document.getElementById('btnNuevo').addEventListener('click', abrirNuevaInscripcion);

    await pintar();
  }

  async function pintar() {
    const tb = document.getElementById('tabla-inscripciones');
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="8">Cargando…</td></tr>';

    const r = await apiLlamada('listarInscripciones', { estado: estado.filtro, tipo: estado.tipo, busqueda: estado.busqueda, pagina: estado.pagina, tamano: estado.tamano });
    if (!r.ok) { tb.innerHTML = '<tr><td colspan="8" style="color:var(--rojo)">' + (r.mensaje || 'Error') + '</td></tr>'; return; }

    if (!r.inscripciones.length) { tb.innerHTML = '<tr><td colspan="8">No hay inscripciones.</td></tr>'; return; }

    const chips = { pendiente: 'chip-pendiente', aprobado: 'chip-aprobado', rechazado: 'chip-rechazado' };

    tb.innerHTML = r.inscripciones.map(function (i) {
      const chip = chips[i.estado.toLowerCase()] || 'chip-pendiente';
      const fecha = i.fecha ? new Date(i.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) : '—';
      const nombre = (i.nombres || '') + ' ' + (i.apellidos || '');
      return '<tr class="fila-datos" data-id="' + i.id + '">' +
        '<td>' + i.id + '</td><td>' + fecha + '</td><td>' + i.tipo + '</td>' +
        '<td>' + nombre + '</td><td>' + (i.codigo || '—') + '</td>' +
        '<td>' + (i.universidad || '—') + '</td><td>' + (i.dni || '—') + '</td>' +
        '<td><span class="chip ' + chip + '">' + i.estado + '</span></td>' +
      '</tr>';
    }).join('');

    // Reasignar click con delegación limpia
    tb.querySelectorAll('tr.fila-datos').forEach(function (tr) {
      tr.addEventListener('click', function () { abrirDetalle(tr.getAttribute('data-id')); });
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

  async function abrirDetalle(id) {
    const r = await apiLlamada('obtenerInscripcion', { id: id });
    if (!r.ok) return notificar(r.mensaje || 'No se pudo abrir.');

    const i = r.inscripcion;
    const modal = document.getElementById('modal');
    const voucher = i.Voucher
      ? '<div class="voucher-caja"><img class="voucher-img" src="' + (r.voucherBase64 ? 'data:' + r.voucherBase64.mimeType + ';base64,' + r.voucherBase64.base64 : i.Voucher) + '" alt="Voucher"></div>'
      : '<div class="alerta alerta-error">Sin voucher registrado.</div>';

    const campos = [
      ['Nombres', i.Nombres], ['Apellidos', (i['Apellido paterno'] || '') + ' ' + (i['Apellido materno'] || '')],
      ['Tipo', i.Tipo], ['Código', i.Código || '—'],
      ['Universidad', i.Universidad || '—'], ['Facultad / Institución', i['Facultad / Institución'] || '—'],
      ['DNI', i.DNI || '—'], ['Celular', i.Celular || '—'],
      ['ID de grupo', i['ID de grupo'] || '—'], ['Fecha', i.Fecha ? new Date(i.Fecha).toLocaleString('es-PE') : '—'],
      ['Monto verificado', i.MontoVerificado || '—'], ['Tipo de pago', i.TipoPago || '—'],
      ['N° transacción', i.NumeroTransaccion || '—'], ['Motivo de rechazo', i.MotivoRechazo || '—']
    ];

    const chip = 'chip-' + String(i.Estado).toLowerCase();

    modal.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo">' +
          '<span>Inscripción <code>' + i.ID + '</code> · <span class="chip ' + chip + '">' + i.Estado + '</span></span>' +
          '<button class="modal-cerrar" onclick="CerrarModal()">×</button>' +
        '</div>' +

        voucher +

        '<div class="detalle-grid">' +
          campos.map(function (c) { return '<div class="detalle-campo"><div class="k">' + c[0] + '</div><div class="v">' + (c[1] || '—') + '</div></div>'; }).join('') +
        '</div>' +

        '<div id="detalleAcciones" class="barra-acciones">' +
          '<label class="campo" style="max-width:280px"><span>Motivo (para rechazo)</span><input type="text" id="motivoRechazo" placeholder="Ej. voucher no legible"></label>' +
          '<div style="display:flex;gap:10px;align-items:center">' +
            '<button class="btn-secundario" id="btnAprobar">Aprobar</button>' +
            '<button class="btn-peligro" id="btnRechazar">Rechazar</button>' +
          '</div>' +
        '</div>' +

        '<div id="avisoAccion"></div>' +
      '</div>';

    document.getElementById('btnAprobar').addEventListener('click', function () { aplicarEstado(i.ID, 'aprobado', ''); });
    document.getElementById('btnRechazar').addEventListener('click', function () {
      aplicarEstado(i.ID, 'rechazado', document.getElementById('motivoRechazo').value.trim());
    });

    modal.classList.remove('oculto');
  }

  async function aplicarEstado(id, estadoNuevo, motivo) {
    const btnAprobar = document.getElementById('btnAprobar');
    const btnRechazar = document.getElementById('btnRechazar');
    btnAprobar.disabled = btnRechazar.disabled = true;

    const r = await apiLlamada('cambiarEstado', { id: id, estado: estadoNuevo, motivo: motivo });
    const aviso = document.getElementById('avisoAccion');
    aviso.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';

    if (r.ok) {
      btnAprobar.disabled = btnRechazar.disabled = false;
      setTimeout(function () { CerrarModal(); pintar(); actualizarResumenSiVisible(); }, 700);
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
          '<label class="campo"><span>Tipo *</span><select id="m-tipo">' +
            '<option value="Estudiante">Estudiante</option>' +
            '<option value="Grupo10">Grupo de 10</option>' +
            '<option value="Egresado">Egresado</option></select></label>' +
          '<label class="campo"><span>Nombres *</span><input id="m-nombres"></label>' +
          '<label class="campo"><span>Apellido paterno</span><input id="m-app"></label>' +
          '<label class="campo"><span>Apellido materno</span><input id="m-apm"></label>' +
          '<label class="campo"><span>Código</span><input id="m-codigo"></label>' +
          '<label class="campo"><span>DNI *</span><input id="m-dni" maxlength="8"></label>' +
          '<label class="campo"><span>Universidad</span><input id="m-universidad"></label>' +
          '<label class="campo"><span>Facultad / Institución</span><input id="m-facultad"></label>' +
          '<label class="campo"><span>Celular</span><input id="m-celular"></label>' +
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

    document.getElementById('btnGuardarNuevo').addEventListener('click', guardarNuevaInscripcion);
    modal.classList.remove('oculto');
  }

  async function guardarNuevaInscripcion() {
    const g = document.getElementById;
    const archivo = g('m-voucher').files[0];
    let voucherBase64 = '';
    if (archivo) {
      try { voucherBase64 = await leerBase64(archivo); }
      catch (e) { return notificar('No se pudo leer el voucher.'); }
    }

    const datos = {
      tipo: g('m-tipo').value,
      nombres: g('m-nombres').value.trim(),
      apellidoPaterno: g('m-app').value.trim(),
      apellidoMaterno: g('m-apm').value.trim(),
      codigo: g('m-codigo').value.trim(),
      dni: g('m-dni').value.trim(),
      universidad: g('m-universidad').value.trim(),
      facultadInstitucion: g('m-facultad').value.trim(),
      celular: g('m-celular').value.trim(),
      grupoId: g('m-grupo').value.trim(),
      montoVerificado: g('m-monto').value.trim(),
      tipoPago: g('m-pago').value.trim(),
      numeroTransaccion: g('m-nro').value.trim(),
      voucher: voucherBase64
    };

    const r = await apiLlamada('registrarManual', { datos: datos });
    const aviso = document.getElementById('avisoNuevo');
    aviso.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
    if (r.ok) setTimeout(function () { CerrarModal(); pintar(); actualizarResumenSiVisible(); }, 800);
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