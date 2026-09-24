// Sección Tareas: tareas acordadas en junta (responsable + plazo + estado).
(function () {
  let yo = null;
  let armado = false;
  let filtroEstado = '';
  let tareas = [];

  const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const n = function (x) { return Number(x || 0); };

  const ESTADOS = [
    ['pendiente', 'Pendiente'],
    ['curso', 'En curso'],
    ['lista', 'Lista']
  ];

  function esAdmin() { return yo && String(yo.rol || '').toLowerCase() === 'admin'; }

  function hoyISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function formatearFecha(iso) {
    const p = String(iso || '').split('-');
    if (p.length !== 3) return iso || '—';
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function opcionesEstado(actual) {
    return ESTADOS.map(function (e) {
      return '<option value="' + e[0] + '"' + (e[0] === actual ? ' selected' : '') + '>' + e[1] + '</option>';
    }).join('');
  }

  function estadoChip(t) {
    const mapa = { pendiente: ['chip-pendiente', 'Pendiente'], curso: ['chip-curso', 'En curso'], lista: ['chip-aprobado', 'Lista'] };
    const e = mapa[t.estado] || mapa.pendiente;
    return '<span class="chip ' + e[0] + '">' + e[1] + '</span>';
  }

  function plazoEtiqueta(t) {
    if (!t.plazo) return '—';
    let html = esc(formatearFecha(t.plazo));
    if (t.vencida) html += '<br><span class="chip chip-rechazado">vencida</span>';
    else if (t.plazo === hoyISO()) html += '<br><span class="chip chip-pendiente">hoy</span>';
    return html;
  }

  function aviso(r) {
    const div = document.getElementById('avisoTareas');
    if (!div) return;
    div.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
  }

  function pintarResumen(resumen) {
    const caja = document.getElementById('resumenTareas');
    if (!caja) return;
    caja.innerHTML =
      '<div class="resumen-minigrid">' +
        '<div class="mini-resumen mini-rechazado"><span class="mini-numero">' + n(resumen.vencida) + '</span><span class="mini-etiqueta">Vencidas</span></div>' +
        '<div class="mini-resumen minipendiente"><span class="mini-numero">' + n(resumen.pendiente) + '</span><span class="mini-etiqueta">Pendientes</span></div>' +
        '<div class="mini-resumen minicurso"><span class="mini-numero">' + n(resumen.curso) + '</span><span class="mini-etiqueta">En curso</span></div>' +
        '<div class="mini-resumen miniaprobado"><span class="mini-numero">' + n(resumen.lista) + '</span><span class="mini-etiqueta">Listas</span></div>' +
        '<div class="mini-resumen"><span class="mini-numero">' + n(resumen.total) + '</span><span class="mini-etiqueta">Total</span></div>' +
      '</div>';
  }

  function pintarLista() {
    const tb = document.getElementById('tabla-tareas');
    if (!tb) return;

    const filas = tareas.filter(function (t) {
      if (!filtroEstado) return true;
      if (filtroEstado === 'vencida') return t.vencida;
      return t.estado === filtroEstado;
    });

    if (!filas.length) {
      tb.innerHTML = '<tr><td colspan="5">No hay tareas' + (filtroEstado ? ' con ese estado.' : ' todavía. Agrega la primera arriba.') + '</td></tr>';
      return;
    }

    const puedoBorrar = esAdmin();
    tb.innerHTML = filas.map(function (t) {
      return '<tr' + (t.vencida ? ' style="background:rgba(192,57,43,0.06)"' : '') + '>' +
        '<td><div style="font-weight:600">' + esc(t.tarea) + '</div>' +
          (t.comentario ? '<div class="tarea-comentario">' + esc(t.comentario) + '</div>' : '') +
          '<div class="tarea-id">' + esc(t.id) + '</div></td>' +
        '<td>' + (t.responsable || '—') + '</td>' +
        '<td>' + plazoEtiqueta(t) + '</td>' +
        '<td>' + estadoChip(t) +
          '<div style="margin-top:6px"><select class="t-cambio-estado" data-cambio="' + esc(t.id) + '" style="font-size:12.5px;padding:4px 8px;border-radius:8px;border:1.5px solid var(--borde);background:var(--blanco);color:var(--texto)">' + opcionesEstado(t.estado) + '</select></div>' +
        '</td>' +
        '<td class="tabla-acciones" style="white-space:nowrap">' +
          '<button class="btn-secundario btn-chico" data-editar="' + esc(t.id) + '">Editar</button> ' +
          (puedoBorrar ? '<button class="btn-peligro btn-chico" data-eliminar="' + esc(t.id) + '">Eliminar</button>' : '') +
        '</td>' +
      '</tr>';
    }).join('');

    tb.querySelectorAll('[data-cambio]').forEach(function (sel) {
      sel.addEventListener('change', async function () {
        sel.disabled = true;
        const r = await apiLlamada('actualizarTarea', { id: sel.getAttribute('data-cambio'), estado: sel.value });
        sel.disabled = false;
        aviso(r);
        if (r.ok) pintar();
      });
    });

    tb.querySelectorAll('[data-editar]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const t = tareas.find(function (x) { return x.id === btn.getAttribute('data-editar'); });
        if (t) abrirEdicion(t);
      });
    });

    tb.querySelectorAll('[data-eliminar]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const id = btn.getAttribute('data-eliminar');
        const t = tareas.find(function (x) { return x.id === id; });
        if (!confirm('¿Eliminar la tarea "' + (t ? t.tarea : id) + '"?\nEsta acción no se puede deshacer.')) return;
        btn.disabled = true;
        const r = await apiLlamada('eliminarTarea', { id: id });
        aviso(r);
        btn.disabled = false;
        if (r.ok) pintar();
      });
    });
  }

  async function pintar() {
    const [rl, rr] = await Promise.all([
      apiLlamada('listarTareas'),
      apiLlamada('resumenTareas')
    ]);
    if (!rl.ok) {
      const tb = document.getElementById('tabla-tareas');
      if (tb) tb.innerHTML = '<tr><td colspan="5" style="color:var(--rojo)">' + esc(rl.mensaje || 'Error') + '</td></tr>';
      return;
    }
    tareas = rl.tareas || [];
    pintarResumen(rr.ok ? rr.resumen : { pendiente: 0, curso: 0, lista: 0, vencida: 0, total: tareas.length });
    pintarLista();
  }

  async function crear() {
    const g = document.getElementById.bind(document);
    const tarea = g('t-nueva').value.trim();
    const responsable = g('t-resp').value.trim();
    if (!tarea) return aviso({ ok: false, mensaje: 'Escribe la tarea.' });
    if (!responsable) return aviso({ ok: false, mensaje: 'Indica el responsable.' });

    const btn = document.getElementById('btnAgregarTarea');
    btn.disabled = true;
    btn.textContent = 'Agregando…';
    const r = await apiLlamada('crearTarea', {
      datos: {
        tarea: tarea,
        responsable: responsable,
        plazo: g('t-plazo').value,
        comentario: ''
      }
    });
    aviso(r);
    btn.disabled = false;
    btn.textContent = '+ Agregar tarea';
    if (r.ok) {
      g('t-nueva').value = '';
      g('t-resp').value = '';
      g('t-plazo').value = '';
      pintar();
    }
  }

  function abrirEdicion(t) {
    const modal = document.getElementById('modal');
    modal.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo"><span>Editar tarea <span style="font-size:12px;color:var(--gris)">' + esc(t.id) + '</span></span>' +
          '<button class="modal-cerrar" onclick="CerrarModal()">×</button></div>' +
        '<div class="detalle-grid" style="grid-template-columns:1fr">' +
          '<label class="campo"><span>Tarea *</span><input id="e-tarea" value="' + esc(t.tarea) + '"></label>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' +
            '<label class="campo"><span>Responsable *</span><input id="e-responsable" list="t-dlist-resp" value="' + esc(t.responsable) + '"></label>' +
            '<label class="campo"><span>Plazo</span><input id="e-plazo" type="date" value="' + esc(t.plazo) + '"></label>' +
          '</div>' +
          '<label class="campo"><span>Estado</span><select id="e-estado">' + opcionesEstado(t.estado) + '</select></label>' +
          '<label class="campo"><span>Comentario</span><textarea id="e-comentario" rows="2">' + esc(t.comentario) + '</textarea></label>' +
        '</div>' +
        '<div id="avisoEditarTarea"></div>' +
        '<div class="barra-acciones" style="justify-content:flex-end">' +
          '<button class="btn-secundario" onclick="CerrarModal()">Cancelar</button>' +
          '<button class="btn-primario" id="btnGuardarTarea">Guardar</button>' +
        '</div>' +
      '</div>';

    document.getElementById('btnGuardarTarea').addEventListener('click', async function () {
      const btn = document.getElementById('btnGuardarTarea');
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      const g = document.getElementById.bind(document);
      const r = await apiLlamada('actualizarTarea', {
        id: t.id,
        tarea: g('e-tarea').value.trim(),
        responsable: g('e-responsable').value.trim(),
        plazo: g('e-plazo').value,
        estado: g('e-estado').value,
        comentario: g('e-comentario').value.trim()
      });
      const avisoEd = document.getElementById('avisoEditarTarea');
      avisoEd.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
      if (r.ok) setTimeout(function () { CerrarModal(); pintar(); }, 700);
      else { btn.disabled = false; btn.textContent = 'Guardar'; }
    });

    modal.classList.remove('oculto');
  }

  function pintarResponsables(gestores) {
    const li = document.getElementById('t-dlist-resp');
    if (!li || !gestores || !gestores.length) return;
    li.innerHTML = gestores.map(function (g) {
      const etiqueta = g.comision ? g.usuario + ' — ' + g.comision : g.usuario;
      return '<option value="' + esc(g.usuario) + '">' + esc(etiqueta) + '</option>';
    }).join('');
  }

  async function cargar() {
    yo = usuarioGuardado();

    if (!armado) {
      const cont = document.getElementById('seccion-tareas');
      cont.innerHTML =
        '<h2 class="seccion-titulo">Tareas</h2>' +
        '<p class="seccion-sub">Tareas acordadas en junta: responsable, plazo y estado. Nada se pierde en el chat ni en cuadernos.</p>' +
        '<div id="resumenTareas" style="margin-bottom:22px"></div>' +

        '<div class="barra-acciones" style="align-items:end">' +
          '<label class="campo"><span>Tarea *</span><input id="t-nueva" placeholder="Escribe la tarea…"></label>' +
          '<label class="campo"><span>Responsable *</span><input id="t-resp" placeholder="Nombre o comisión" list="t-dlist-resp"></label>' +
          '<label class="campo"><span>Plazo</span><input id="t-plazo" type="date"></label>' +
          '<button class="btn-primario" id="btnAgregarTarea">+ Agregar tarea</button>' +
        '</div>' +
        '<datalist id="t-dlist-resp"></datalist>' +

        '<div class="barra-acciones" style="align-items:end;margin-bottom:12px">' +
          '<label class="campo"><span>Filtrar por estado</span><select id="t-filtro-estado">' +
            '<option value="">Todas</option>' +
            '<option value="vencida">Vencidas</option>' +
            '<option value="pendiente">Pendientes</option>' +
            '<option value="curso">En curso</option>' +
            '<option value="lista">Listas</option>' +
          '</select></label>' +
        '</div>' +

        '<div class="tabla-envoltorio">' +
          '<table class="tabla">' +
            '<thead><tr><th>Tarea</th><th>Responsable</th><th>Plazo</th><th>Estado</th><th>Acciones</th></tr></thead>' +
            '<tbody id="tabla-tareas"></tbody>' +
          '</table>' +
        '</div>' +
        '<div id="avisoTareas"></div>';

      document.getElementById('btnAgregarTarea').addEventListener('click', crear);
      document.getElementById('t-nueva').addEventListener('keydown', function (e) { if (e.key === 'Enter') crear(); });
      document.getElementById('t-filtro-estado').addEventListener('change', function () {
        filtroEstado = this.value;
        pintarLista();
      });
      armado = true;
    }

    apiLlamada('listarGestores').then(function (r) {
      if (r.ok) pintarResponsables(r.gestores);
    });

    await pintar();
  }

  window.SeccionTareas = { mostrar: cargar };
})();