// Guardar / leer identidad del gestor en la sesión.

function usuarioGuardado() {
  try { return JSON.parse(sessionStorage.getItem('expobio_usuario')); }
  catch (e) { return null; }
}

function guardarUsuario(gestor) {
  sessionStorage.setItem('expobio_usuario', JSON.stringify(gestor));
}

function requiereSesion() {
  const token = sessionStorage.getItem('expobio_token');
  if (!token) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function cerrarSesion() {
  sessionStorage.removeItem('expobio_token');
  sessionStorage.removeItem('expobio_usuario');
  window.location.href = 'index.html';
}