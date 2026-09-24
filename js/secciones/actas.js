// Sección Actas y Archivos: índice centralizado de actas de junta con archivos.
(function () {
  let yo = null;
  let armado = false;
  let filtroEstado = '';
  let actas = [];

  const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  const n = function (x) { return Number(x || 0); };

  const ESTADOS = [
    ['borrador', 'Borrador'],
    ['aprobada', 'Aprobada']
  ];

  function esAdmin() { return yo && String(yo.rol || '').toLowerCase() === 'admin'; }

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

  function estadoChip(a) {
    return a.estado === 'aprobada'
      ? '<span class="chip chip-aprobado">Aprobada</span>'
      : '<span class="chip chip-pendiente">Borrador</span>';
  }

  function aviso(r) {
    const div = document.getElementById('avisoActas');
    if (!div) return;
    div.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
  }

  function pintarResumen(resumen) {
    const caja = document.getElementById('resumenActas');
    if (!caja) return;
    caja.innerHTML =
      '<div class="resumen-minigrid">' +
        '<div class="mini-resumen"><span class="mini-numero">' + n(resumen.total) + '</span><span class="mini-etiqueta">Total</span></div>' +
        '<div class="mini-resumen minipendiente"><span class="mini-numero">' + n(resumen.borrador) + '</span><span class="mini-etiqueta">Borradores</span></div>' +
        '<div class="mini-resumen miniaprobado"><span class="mini-numero">' + n(resumen.aprobada) + '</span><span class="mini-etiqueta">Aprobadas</span></div>' +
        '<div class="mini-resumen minicurso"><span class="mini-numero">' + n(resumen.conArchivos) + '</span><span class="mini-etiqueta">Con archivos</span></div>' +
      '</div>';
  }

  function etiquetaLink(u) {
    const s = String(u || '').trim().replace(/^https?:\/\//i, '');
    if (s.indexOf('drive.google.com/') === 0) {
      const m = s.match(/\/file\/d\/([^/?]+)/);
      if (m) return m[1].slice(0, 60);
    }
    return s.length > 60 ? s.slice(0, 57) + '…' : s;
  }

  function linksArchivos(a) {
    if (!a.archivos.length) return '<span class="bloque-vacio">Sin archivos</span>';
    return a.archivos.map(function (u) {
      return '<a class="archivo-link" href="' + esc(u) + '" target="_blank" rel="noopener">↗ ' + esc(etiquetaLink(u)) + '</a>';
    }).join('');
  }

  function pintarLista() {
    const tb = document.getElementById('tabla-actas');
    if (!tb) return;

    const filas = actas.filter(function (a) {
      return filtroEstado ? a.estado === filtroEstado : true;
    });

    if (!filas.length) {
      tb.innerHTML = '<tr><td colspan="6">No hay actas' + (filtroEstado ? ' con ese estado.' : ' todavía. Agrega la primera arriba.') + '</td></tr>';
      return;
    }

    const puedoBorrar = esAdmin();
    tb.innerHTML = filas.map(function (a) {
      return '<tr>' +
        '<td>' + (a.numero || '—') + '<div class="tarea-id">' + esc(a.id) + '</div></td>' +
        '<td>' + esc(a.fecha ? formatearFecha(a.fecha) : '—') + '</td>' +
        '<td><div style="font-weight:600">' + esc(a.tema) + '</div>' +
          (a.puntos ? '<div class="tarea-comentario">' + esc(a.puntos) + '</div>' : '') +
          (a.responsable ? '<div class="acta-responsable">' + esc(a.responsable) + '</div>' : '') +
        '</td>' +
        '<td>' + linksArchivos(a) +
          '<div style="margin-top:6px"><button class="btn-secundario btn-chico" data-link="' + esc(a.id) + '">+ Añadir link</button></div>' +
        '</td>' +
        '<td>' + estadoChip(a) +
          '<div style="margin-top:6px"><select class="a-cambio-estado" data-cambio="' + esc(a.id) + '" style="font-size:12.5px;padding:4px 8px;border-radius:8px;border:1.5px solid var(--borde);background:var(--blanco);color:var(--texto)">' + opcionesEstado(a.estado) + '</select></div>' +
        '</td>' +
        '<td class="tabla-acciones" style="white-space:nowrap">' +
          '<button class="btn-secundario btn-chico" data-editar="' + esc(a.id) + '">Editar</button> ' +
          (puedoBorrar ? '<button class="btn-peligro btn-chico" data-eliminar="' + esc(a.id) + '">Eliminar</button>' : '') +
        '</td>' +
      '</tr>';
    }).join('');

    tb.querySelectorAll('[data-cambio]').forEach(function (sel) {
      sel.addEventListener('change', async function () {
        sel.disabled = true;
        const r = await apiLlamada('actualizarActa', { id: sel.getAttribute('data-cambio'), estado: sel.value });
        sel.disabled = false;
        aviso(r);
        if (r.ok) pintar();
      });
    });

    tb.querySelectorAll('[data-link]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const id = btn.getAttribute('data-link');
        const a = actas.find(function (x) { return x.id === id; });
        const url = prompt('Pega el link del archivo (Google Drive, PDF…):');
        if (url === null) return;
        const limpio = String(url).trim();
        if (!limpio) return;
        const actual = (a && a.archivos ? a.archivos : []).concat([limpio]);
        const r = await apiLlamada('actualizarActa', { id: id, archivos: actual.join('\n') });
        aviso(r);
        if (r.ok) pintar();
      });
    });

    tb.querySelectorAll('[data-editar]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const a = actas.find(function (x) { return x.id === btn.getAttribute('data-editar'); });
        if (a) abrirEdicion(a);
      });
    });

    tb.querySelectorAll('[data-eliminar]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const id = btn.getAttribute('data-eliminar');
        const a = actas.find(function (x) { return x.id === id; });
        if (!confirm('¿Eliminar el acta "' + (a ? a.tema : id) + '"?\nEsta acción no se puede deshacer.')) return;
        btn.disabled = true;
        const r = await apiLlamada('eliminarActa', { id: id });
        aviso(r);
        btn.disabled = false;
        if (r.ok) pintar();
      });
    });
  }

  async function pintar() {
    const [rl, rr] = await Promise.all([
      apiLlamada('listarActas'),
      apiLlamada('resumenActas')
    ]);
    if (!rl.ok) {
      const tb = document.getElementById('tabla-actas');
      if (tb) tb.innerHTML = '<tr><td colspan="6" style="color:var(--rojo)">' + esc(rl.mensaje || 'Error') + '</td></tr>';
      return;
    }
    actas = rl.actas || [];
    pintarResumen(rr.ok ? rr.resumen : { total: actas.length, borrador: 0, aprobada: 0, conArchivos: 0 });
    pintarLista();
  }

  async function crear() {
    const g = document.getElementById.bind(document);
    const tema = g('a-tema').value.trim();
    if (!tema) return aviso({ ok: false, mensaje: 'Escribe el tema del acta.' });

    const btn = document.getElementById('btnAgregarActa');
    btn.disabled = true;
    btn.textContent = 'Agregando…';
    const r = await apiLlamada('crearActa', {
      datos: {
        fecha: g('a-fecha').value,
        numero: g('a-numero').value.trim(),
        tema: tema,
        responsable: g('a-responsable').value.trim(),
        estado: g('a-estado').value,
        archivos: g('a-link').value.trim(),
        puntos: ''
      }
    });
    aviso(r);
    btn.disabled = false;
    btn.textContent = '+ Agregar acta';
    if (r.ok) {
      g('a-numero').value = '';
      g('a-tema').value = '';
      g('a-responsable').value = '';
      g('a-link').value = '';
      pintar();
    }
  }

  function abrirEdicion(a) {
    const modal = document.getElementById('modal');
    modal.innerHTML =
      '<div class="modal-caja">' +
        '<div class="modal-titulo"><span>Editar acta <span style="font-size:12px;color:var(--gris)">' + esc(a.id) + '</span></span>' +
          '<button class="modal-cerrar" onclick="CerrarModal()">×</button></div>' +
        '<div class="detalle-grid" style="grid-template-columns:1fr">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">' +
            '<label class="campo"><span>Fecha</span><input id="e-fecha" type="date" value="' + esc(a.fecha) + '"></label>' +
            '<label class="campo"><span>Número</span><input id="e-numero" value="' + esc(a.numero) + '" placeholder="005-2026"></label>' +
            '<label class="campo"><span>Estado</span><select id="e-estado">' + opcionesEstado(a.estado) + '</select></label>' +
          '</div>' +
          '<label class="campo"><span>Tema *</span><input id="e-tema" value="' + esc(a.tema) + '"></label>' +
          '<label class="campo"><span>Responsable</span><input id="e-responsable" list="a-dlist-resp" value="' + esc(a.responsable) + '"></label>' +
          '<label class="campo"><span>Archivos (uno por línea)</span><textarea id="e-archivos" rows="3">' + esc(a.archivos.join('\n')) + '</textarea></label>' +
          '<label class="campo"><span>Puntos tratados</span><textarea id="e-puntos" rows="3">' + esc(a.puntos) + '</textarea></label>' +
        '</div>' +
        '<div id="avisoEditarActa"></div>' +
        '<div class="barra-acciones" style="justify-content:flex-end">' +
          '<button class="btn-secundario" onclick="CerrarModal()">Cancelar</button>' +
          '<button class="btn-primario" id="btnGuardarActa">Guardar</button>' +
        '</div>' +
      '</div>';

    document.getElementById('btnGuardarActa').addEventListener('click', async function () {
      const btn = document.getElementById('btnGuardarActa');
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      const g = document.getElementById.bind(document);
      const r = await apiLlamada('actualizarActa', {
        id: a.id,
        fecha: g('e-fecha').value,
        numero: g('e-numero').value.trim(),
        tema: g('e-tema').value.trim(),
        responsable: g('e-responsable').value.trim(),
        estado: g('e-estado').value,
        archivos: g('e-archivos').value,
        puntos: g('e-puntos').value.trim()
      });
      const avisoEd = document.getElementById('avisoEditarActa');
      avisoEd.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
      if (r.ok) setTimeout(function () { CerrarModal(); pintar(); }, 700);
      else { btn.disabled = false; btn.textContent = 'Guardar'; }
    });

    modal.classList.remove('oculto');
  }

  function pintarResponsables(gestores) {
    const li = document.getElementById('a-dlist-resp');
    if (!li || !gestores || !gestores.length) return;
    li.innerHTML = gestores.map(function (g) {
      const etiqueta = g.comision ? g.usuario + ' — ' + g.comision : g.usuario;
      return '<option value="' + esc(g.usuario) + '">' + esc(etiqueta) + '</option>';
    }).join('');
  }

  async function cargar() {
    yo = usuarioGuardado();

    if (!armado) {
      const cont = document.getElementById('seccion-actas');
      cont.innerHTML =
        '<h2 class="seccion-titulo">Actas y Archivos</h2>' +
        '<p class="seccion-sub">Índice centralizado de actas: número, fecha, tema, responsable, estado y links a los archivos (Drive, PDF…).</p>' +
        '<div id="resumenActas" style="margin-bottom:22px"></div>' +

        '<div class="barra-acciones" style="align-items:end">' +
          '<label class="campo"><span>Tema *</span><input id="a-tema" placeholder="Tema del acta…"></label>' +
          '<label class="campo"><span>Número</span><input id="a-numero" placeholder="005-2026"></label>' +
          '<label class="campo"><span>Fecha</span><input id="a-fecha" type="date"></label>' +
          '<label class="campo"><span>Responsable</span><input id="a-responsable" placeholder="Quién la redacta" list="a-dlist-resp"></label>' +
          '<label class="campo"><span>Estado</span><select id="a-estado">' + opcionesEstado('borrador') + '</select></label>' +
          '<label class="campo"><span>Link archivo</span><input id="a-link" placeholder="https://drv…"></label>' +
          '<button class="btn-primario" id="btnAgregarActa">+ Agregar acta</button>' +
        '</div>' +
        '<datalist id="a-dlist-resp"></datalist>' +

        '<div class="barra-acciones" style="align-items:end;margin-bottom:12px">' +
          '<label class="campo"><span>Filtrar por estado</span><select id="a-filtro-estado">' +
            '<option value="">Todas</option>' +
            '<option value="borrador">Borradores</option>' +
            '<option value="aprobada">Aprobadas</option>' +
          '</select></label>' +
        '</div>' +

        '<div class="tabla-envoltorio">' +
          '<table class="tabla">' +
            '<thead><tr><th>N°</th><th>Fecha</th><th>Tema</th><th>Archivos</th><th>Estado</th><th>Acciones</th></tr></thead>' +
            '<tbody id="tabla-actas"></tbody>' +
          '</table>' +
        '</div>' +
        '<div id="avisoActas"></div>';

      document.getElementById('btnAgregarActa').addEventListener('click', crear);
      document.getElementById('a-tema').addEventListener('keydown', function (e) { if (e.key === 'Enter') crear(); });
      document.getElementById('a-filtro-estado').addEventListener('change', function () {
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

  window.SeccionActas = { mostrar: cargar };
})();