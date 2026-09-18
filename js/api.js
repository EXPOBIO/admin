// Capa de comunicación con la API de Apps Script.
// text/plain evita el preflight OPTIONS (Apps Script no lo maneja).

async function apiFetch(accion, datos) {
  const body = Object.assign({ accion: accion }, datos || {});
  const token = sessionStorage.getItem('expobio_token');
  if (token) body.token = token;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error('Error de red: ' + res.status);
  return res.json();
}

async function apiLlamada(accion, datos) {
  const resp = await apiFetch(accion, datos);
  if (resp && resp.error === 'no_auth') {
    sessionStorage.removeItem('expobio_token');
    sessionStorage.removeItem('expobio_usuario');
    window.location.href = 'index.html';
  }
  return resp;
}