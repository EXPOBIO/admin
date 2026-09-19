// Sección Gestores: crear gestores (todos) y gestionar (solo admin).
(function () {
  let yo = null;
  let armado = false;

  async function cargar() {
    yo = usuarioGuardado();

    if (!armado) {
      const esAdmin = yo && String(yo.rol || '').toLowerCase() === 'admin';

      const cont = document.getElementById('seccion-gestores');
      cont.innerHTML =
        '<h2 class="seccion-titulo">Gestores</h2>' +
        '<p class="seccion-sub">Usuarios con acceso al panel' + (esAdmin ? ' · solo administradores editan gestores' : ' · puedes crear nuevos gestores') + '</p>' +

        '<div class="barra-acciones">' +
          '<label class="campo"><input type="text" id="g-usuario" placeholder="Usuario" autocomplete="off"></label>' +
          '<label class="campo"><input type="password" id="g-clave" placeholder="Contraseña (mín 6)"></label>' +
          '<label class="campo"><input type="text" id="g-comision" placeholder="Comisión (ej. Logística)"></label>' +
          (esAdmin ? '<label class="campo"><select id="g-rol"><option value="gestor">Gestor</option><option value="admin">Admin</option></select></label>' : '') +
          '<button class="btn-primario" id="btnCrearGestor">Crear gestor</button>' +
        '</div>' +

        '<div class="tarjeta-resumen" style="padding:10px 18px">' +
          '<div id="lista-gestores"></div>' +
        '</div>' +
        '<div id="avisoGestores"></div>';

      document.getElementById('btnCrearGestor').addEventListener('click', function () {
        const g = document.getElementById.bind(document);
        crear({
          usuario: g('g-usuario').value.trim(),
          clave: g('g-clave').value,
          comision: g('g-comision').value.trim(),
          rol: esAdmin ? g('g-rol').value : 'gestor'
        });
      });
      armado = true;
    }

    await pintar();
  }

  async function pintar() {
    const r = await apiLlamada('listarGestores');
    const div = document.getElementById('lista-gestores');
    if (!div) return;
    if (!r.ok) { div.innerHTML = '<div class="alerta alerta-error">' + (r.mensaje || 'Error') + '</div>'; return; }

    const esAdmin = yo && String(yo.rol || '').toLowerCase() === 'admin';

    div.innerHTML = r.gestores.map(function (g) {
      const activo = String(g.activo).toLowerCase() !== 'no';
      const mismo = yo && String(yo.usuario).toLowerCase() === String(g.usuario).toLowerCase();
      return '<div class="gestor-fila">' +
        '<div class="gestor-info">' +
          '<div class="nombre">' + g.usuario +
            (String(g.rol).toLowerCase() === 'admin' ? ' <span class="chip chip-aprobado">admin</span>' : '') +
            (activo ? '' : ' <span class="chip chip-rechazado">desactivado</span>') +
          '</div>' +
          '<div class="extra">' + (g.comision || '—') + '</div>' +
        '</div>' +
        (esAdmin && !mismo ?
          '<button class="btn-secundario btn-chico" data-toggle="' + g.usuario + '">' + (activo ? 'Desactivar' : 'Activar') + '</button>' : '') +
      '</div>';
    }).join('');

    div.querySelectorAll('[data-toggle]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const usuario = btn.getAttribute('data-toggle');
        const proximo = btn.textContent === 'Desactivar' ? 'no' : 'si';
        if (!confirm('¿' + btn.textContent + ' al gestor "' + usuario + '"?')) return;
        const r = await apiLlamada('actualizarGestor', { usuario: usuario, activo: proximo });
        aviso(r);
        if (r.ok) pintar();
      });
    });
  }

  async function crear(cuerpo) {
    if (!cuerpo.usuario || cuerpo.clave.length < 6) {
      return aviso({ ok: false, mensaje: 'Usuario vacío o contraseña menor a 6 caracteres.' });
    }
    const btn = document.getElementById('btnCrearGestor');
    btn.disabled = true;
    btn.textContent = 'Creando…';
    const r = await apiLlamada('crearGestor', cuerpo);
    aviso(r);
    btn.disabled = false;
    btn.textContent = 'Crear gestor';
    if (r.ok) {
      const g = document.getElementById.bind(document);
      ['g-usuario', 'g-clave', 'g-comision'].forEach(function (id) { g(id).value = ''; });
      pintar();
    }
  }

  function aviso(r) {
    const div = document.getElementById('avisoGestores');
    div.innerHTML = '<div class="alerta ' + (r.ok ? 'alerta-ok' : 'alerta-error') + '">' + (r.mensaje || '') + '</div>';
  }

  window.SeccionGestores = { mostrar: cargar };
})();