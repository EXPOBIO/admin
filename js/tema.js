// Cambio de tema claro/oscuro (se recuerda en localStorage).
(function () {
  const CLAVE = 'expobio_tema';

  function textoBoton(t) {
    return t === 'oscuro' ? 'Claro' : 'Oscuro';
  }

  function aplicar(t) {
    document.documentElement.setAttribute('data-tema', t);
    document.querySelectorAll('.btn-tema').forEach(function (b) {
      b.textContent = textoBoton(t);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    const t = localStorage.getItem(CLAVE) || 'claro';
    aplicar(t);
    document.querySelectorAll('.btn-tema').forEach(function (b) {
      b.addEventListener('click', function () {
        const nuevo = document.documentElement.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
        localStorage.setItem(CLAVE, nuevo);
        aplicar(nuevo);
      });
    });
  });
})();