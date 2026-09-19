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

// ---------- Caché de lecturas ----------
// Los datos cambian poco; las mutaciones son las que agregan/corrigen.
// Las lecturas se guardan en memoria (TTL corto) y cualquier mutación
// invalida la caché para devolver siempre datos frescos tras escribir.
const CACHE_TTL_MS = 60000;
const CACHEABLES = {
  resumen: CACHE_TTL_MS,
  resumenOrganizadores: CACHE_TTL_MS,
  listarGestores: CACHE_TTL_MS,
  listarOrganizadores: CACHE_TTL_MS,
  listarInscripciones: CACHE_TTL_MS,
  obtenerInscripcion: CACHE_TTL_MS,
  verificar: 30000
};
const cacheLecturas = new Map();

function claveCache(accion, datos) {
  return accion + '|' + JSON.stringify(datos || {});
}

function leerCache(accion, datos, ttl) {
  const clave = claveCache(accion, datos);
  const elem = cacheLecturas.get(clave);
  if (elem && Date.now() - elem.ts < ttl) return elem.resp;
  cacheLecturas.delete(clave);
  return null;
}

function guardarEnCache(accion, datos, resp) {
  cacheLecturas.set(claveCache(accion, datos), { ts: Date.now(), resp: resp });
}

function limpiarCacheLecturas() {
  cacheLecturas.clear();
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
  const ttl = CACHEABLES[accion];
  if (ttl) {
    const guardado = leerCache(accion, datos, ttl);
    if (guardado !== null) return guardado;
  }

  const resp = await apiFetch(accion, datos);
  if (resp && resp.error === 'no_auth') {
    limpiarCacheLecturas();
    sessionStorage.removeItem('expobio_token');
    sessionStorage.removeItem('expobio_usuario');
    window.location.href = 'index.html';
    return resp;
  }

  if (ttl) {
    // Solo se cachean respuestas válidas (nunca errores ni no_auth).
    if (resp && resp.ok && resp.error !== 'no_auth') guardarEnCache(accion, datos, resp);
  } else {
    // Cualquier mutación invalida las lecturas guardadas.
    limpiarCacheLecturas();
  }
  return resp;
}