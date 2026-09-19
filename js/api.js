// Capa de comunicación con la API de Apps Script.
// text/plain evita el preflight OPTIONS (Apps Script no lo maneja).

// ---------- Indicador de carga global ----------
let cargasPendientes = 0;
let agendadoOcultar = false;

function capaCarga_() {
  return document.getElementById('capaCarga');
}

function mostrarCarga() {
  const c = capaCarga_();
  if (c) c.hidden = false;
  agendadoOcultar = false;
}

function ocultarCarga() {
  if (agendadoOcultar) return;
  agendadoOcultar = true;
  setTimeout(function () {
    agendadoOcultar = false;
    const c = capaCarga_();
    if (c) c.hidden = true;
  }, 120);
}

async function apiFetch(accion, datos) {
  const body = Object.assign({ accion: accion }, datos || {});
  const token = sessionStorage.getItem('expobio_token');
  if (token) body.token = token;

  cargasPendientes++;
  mostrarCarga();

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error('Error de red: ' + res.status);
    return res.json();
  } finally {
    cargasPendientes--;
    if (cargasPendientes <= 0) {
      cargasPendientes = 0;
      ocultarCarga();
    }
  }
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