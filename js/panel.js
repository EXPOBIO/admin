// Router principal del panel.
document.addEventListener('DOMContentLoaded', function () {
  if (!requiereSesion()) return;

  // Identidad en el lateral
  const u = usuarioGuardado();
  if (u) {
    document.getElementById('lblUsuario').textContent = u.usuario || '—';
    document.getElementById('lblRol').textContent = (u.comision || (u.rol || '')) || '';
  }

  document.getElementById('btnSalir').addEventListener('click', function () {
    apiLlamada('logout').finally(function () { cerrarSesion(); });
  });

  // Navegación por secciones
  const secciones = [
    { nombre: 'resumen', obj: window.SeccionResumen },
    { nombre: 'inscripciones', obj: window.SeccionInscripciones },
    { nombre: 'organizadores', obj: window.SeccionOrganizadores },
    { nombre: 'precios', obj: window.SeccionPrecios },
    { nombre: 'gestores', obj: window.SeccionGestores }
  ];

  function mostrarSeccion(nombre) {
    document.querySelectorAll('.nav-item').forEach(function (b) {
      b.classList.toggle('activo', b.getAttribute('data-seccion') === nombre);
    });
    document.querySelectorAll('.seccion').forEach(function (s) {
      s.classList.toggle('oculto', s.id !== 'seccion-' + nombre);
    });
    const sec = secciones.find(function (s) { return s.nombre === nombre; });
    if (sec && sec.obj) sec.obj.mostrar();
  }

  document.getElementById('navSecciones').addEventListener('click', function (e) {
    const btn = e.target.closest('.nav-item');
    if (btn) mostrarSeccion(btn.getAttribute('data-seccion'));
  });

  // Verificación de que el token siga vivo
  apiLlamada('verificar').then(function (r) {
    if (!r.ok && r.error === 'no_auth') { cerrarSesion(); return; }
    window.verificado = true;
  });

  mostrarSeccion('resumen');
});

// Helpers globales compartidos por las secciones.

function CerrarModal() {
  const modal = document.getElementById('modal');
  if (modal) {
    modal.classList.add('oculto');
    modal.innerHTML = '';
  }
}

function notificar(msg) {
  const div = document.getElementById('avisoAccion') ||
    document.getElementById('avisoPrecios') ||
    document.getElementById('avisoGestores');
  if (div) div.innerHTML = '<div class="alerta alerta-error">' + msg + '</div>';
  else alert(msg);
}

function actualizarResumenSiVisible() {
  const seccion = document.querySelector('.seccion:not(.oculto)');
  if (seccion && seccion.id === 'seccion-resumen') window.SeccionResumen.mostrar();
}

document.addEventListener('click', function (e) {
  if (e.target.classList && e.target.classList.contains('modal-fondo')) CerrarModal();
});