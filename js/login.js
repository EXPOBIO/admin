// Lógica del login.

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('btnEntrar');

  // Si ya hay sesión, ir directo al panel.
  if (sessionStorage.getItem('expobio_token')) {
    apiLlamada('verificar').then(function (r) {
      if (r.ok) { window.location.href = 'panel.html'; return; }
      sessionStorage.removeItem('expobio_token');
    }).catch(function () {});
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    const usuario = document.getElementById('usuario').value.trim();
    const clave = document.getElementById('clave').value;

    if (!usuario || !clave) {
      mostrarError('Ingresa tu usuario y contraseña.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Entrando…';

    try {
      const r = await apiFetch('login', { usuario: usuario, clave: clave });
      if (r.ok) {
        sessionStorage.setItem('expobio_token', r.token);
        guardarUsuario(r.gestor);
        window.location.href = 'panel.html';
      } else {
        mostrarError(r.mensaje || 'Credenciales incorrectas.');
      }
    } catch (err) {
      mostrarError('No se pudo conectar. Revisa que API_URL esté configurada: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });

  function mostrarError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
});