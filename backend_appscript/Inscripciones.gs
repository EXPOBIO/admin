
    feat(admin): soportar doble voucher en misma celda (split , ; \n) + columna Voucher2

/**
 * INSCRIPCIONES — listado, detalle, estado, voucher, CSV, estadísticas.
 * Hoja Inscripciones (encabezado ordenado, ver Utilidades):
 * ID, ID de grupo, Fecha, Tipo, Nombres, Apellido paterno,
 * Apellido materno, Código, Universidad, Facultad / Institución,
 * DNI, Celular, Voucher, Estado, MontoVerificado, TipoPago,
 * NumeroTransaccion, MotivoRechazo
 */

const ESTADOS_VALIDOS = ['pendiente', 'aprobado', 'rechazado'];
const TIPOS_PAGO = ['fisico', 'Fisico', 'Físico', 'físico', 'otro medio', 'Otro medio'];

function parsearNumero_(valor) {
  const n = parseFloat(String(valor || '').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function normalizarTipoPago_(tp) {
  const v = String(tp || '').trim().toLowerCase();
  if (!v) return 'Sin especificar';
  if (v.indexOf('fis') !== -1 || v.indexOf('presen') !== -1) return 'Físico';
  if (v.indexOf('yape') !== -1) return 'Yape';
  if (v.indexOf('plin') !== -1) return 'Plin';
  if (v.indexOf('transfer') !== -1) return 'Transferencia';
  if (v.indexOf('otro') !== -1) return 'Otro medio';
  return String(tp).trim();
}

/**
 * Construye unidades contables a partir de la hoja.
 * Un Grupo10 comparte un solo voucher y UN SOLO pago: se agrupa por
 * "ID de grupo" y cuenta como 1 (no por integrante). Los demás
 * registros cuentan individualmente.
 */
function unidadesInscripciones_(data, headers) {
  const idxGrupo = headers.indexOf('ID de grupo');
  const idxTipo = headers.indexOf('Tipo');
  const idxE = headers.indexOf('Estado');
  const idxMonto = headers.indexOf('MontoVerificado');
  const idxPago = headers.indexOf('TipoPago');
  const idxTrans = headers.indexOf('NumeroTransaccion');
  const idxFecha = headers.indexOf('Fecha');
  const idxNombre = headers.indexOf('Nombres');
  const idxApp = headers.indexOf('Apellido paterno');
  const idxApm = headers.indexOf('Apellido materno');
  const idxCod = headers.indexOf('Código');
  const idxUni = headers.indexOf('Universidad');
  const idxDni = headers.indexOf('DNI');

  const grupos = {};
  const unidades = [];

  for (let i = 1; i < data.length; i++) {
    const tipo = String(data[i][idxTipo]).trim() || 'Estudiante';
    const grupoId = String(data[i][idxGrupo]).trim();

    if (tipo === 'Grupo10' && grupoId) {
      if (!grupos[grupoId]) {
        grupos[grupoId] = {
          esGrupo: true,
          grupoId: grupoId,
          tipo: 'Grupo10',
          estado: String(data[i][idxE]).trim().toLowerCase(),
          monto: parsearNumero_(data[i][idxMonto]),
          tipoPago: normalizarTipoPago_(data[i][idxPago]),
          transaccion: String(data[i][idxTrans] || '').trim(),
          fecha: data[i][idxFecha],
          repId: data[i][0],
          repNombres: data[i][idxNombre],
          repApellidoPaterno: data[i][idxApp],
          repApellidoMaterno: data[i][idxApm],
          repCodigo: data[i][idxCod],
          repUniversidad: data[i][idxUni],
          repDni: data[i][idxDni],
          cantidad: 0,
          integrantes: []
        };
      }
      grupos[grupoId].cantidad++;
      grupos[grupoId].integrantes.push({
        id: data[i][0],
        nombres: data[i][idxNombre],
        apPat: data[i][idxApp],
        apMat: data[i][idxApm],
        codigo: data[i][idxCod],
        universidad: data[i][idxUni],
        dni: data[i][idxDni],
        estado: String(data[i][idxE]).trim(),
        fecha: data[i][idxFecha]
      });
    } else {
      unidades.push({
        esGrupo: false,
        grupoId: '',
        tipo: tipo,
        estado: String(data[i][idxE]).trim().toLowerCase(),
        monto: parsearNumero_(data[i][idxMonto]),
        tipoPago: normalizarTipoPago_(data[i][idxPago]),
        transaccion: String(data[i][idxTrans] || '').trim(),
        fecha: data[i][idxFecha],
        repId: data[i][0],
        repNombres: data[i][idxNombre],
        repApellidoPaterno: data[i][idxApp],
        repApellidoMaterno: data[i][idxApm],
        repCodigo: data[i][idxCod],
        repUniversidad: data[i][idxUni],
        repDni: data[i][idxDni],
        fila: i
      });
    }
  }

  for (const g in grupos) unidades.push(grupos[g]);
  return unidades;
}

/**
 * Versión cacheada de unidadesInscripciones_(): evita releer la hoja y
 * reprocesar todas las filas en cada búsqueda o cambio de página.
 * La clave incluye la versión de escrituras (_v): una escritura del panel
 * invalida la caché sola. TTL corto para no ocultar filas nuevas que llegan
 * desde el formulario público. Si el snapshot no cabe (~80 KB), se recalcula
 * en vivo sin cachear.
 */
function unidadesDesdeCache_() {
  const cache = CacheService.getScriptCache();
  const version = cache.get('_v') || '0';
  const clave = 'uni::' + version;
  const guardado = cache.get(clave);
  if (guardado !== null) {
    try { return JSON.parse(guardado); } catch (err) { /* snapshot corrupto: recalcular */ }
  }
  const hoja = hojaInscripcionesValida_();
  const data = hoja.getDataRange().getValues();
  const unidades = unidadesInscripciones_(data, data[0]);
  if (data.length > 800) return unidades; // tablas grandes: no vale la pena el snapshot
  const json = JSON.stringify(unidades);
  if (json.length <= 80000) cache.put(clave, json, 25);
  return unidades;
}

function contarResumen_() {
  return { unidades: 0, personas: 0, grupos: 0, individuales: 0, personasGrupos: 0, dinero: 0 };
}

function obtenerResumen_() {
  const hoja = hojaInscripcionesValida_();
  const data = hoja.getDataRange().getValues();
  const headers = data[0];

  const estadoContadores = {};
  const porTipo = {};
  const porTipoPago = {};
  const obs = { unidades: 0, porProblema: { sinMonto: 0, sinTipoPago: 0, sinTransaccion: 0 } };

  const unidades = unidadesInscripciones_(data, headers);
  unidades.forEach(function (u) {
    const estado = u.estado || 'sinestado';
    const personas = u.esGrupo ? (u.cantidad || 1) : 1;

    if (!estadoContadores[estado]) estadoContadores[estado] = contarResumen_();
    const c = estadoContadores[estado];
    c.unidades++;
    c.personas += personas;
    if (u.esGrupo) { c.grupos++; c.personasGrupos += personas; }
    else c.individuales++;
    if (estado === 'aprobado') c.dinero += u.monto;

    if (porTipo[u.tipo] === undefined) porTipo[u.tipo] = 0;
    porTipo[u.tipo]++;

    if (porTipoPago[u.tipoPago] === undefined) porTipoPago[u.tipoPago] = { cantidad: 0, monto: 0 };
    porTipoPago[u.tipoPago].cantidad++;
    if (estado === 'aprobado') porTipoPago[u.tipoPago].monto += u.monto;

    // "En observación": inscrito pero sin datos de pago claros.
    if (estado === 'aprobado' || estado === 'pendiente') {
      const sinMonto = u.monto <= 0;
      const sinTipoPago = !u.tipoPago || u.tipoPago === 'Sin especificar';
      const sinTransaccion = !String(u.transaccion || '').trim();
      if (sinMonto || sinTipoPago || sinTransaccion) {
        obs.unidades++;
        if (sinMonto) obs.porProblema.sinMonto++;
        if (sinTipoPago) obs.porProblema.sinTipoPago++;
        if (sinTransaccion) obs.porProblema.sinTransaccion++;
      }
    }
  });

  // Duplicados: DNI repetido y comprobantes de pago compartidos.
  const porDni = duplicadosPorDni_(data, headers);
  const porPago = duplicadosPorPago_(unidades);

  const ap = estadoContadores.aprobado || contarResumen_();
  const pe = estadoContadores.pendiente || contarResumen_();
  const re = estadoContadores.rechazado || contarResumen_();

  return {
    ok: true,
    resumen: {
      total: ap.unidades + pe.unidades + re.unidades,
      personas: ap.personas + pe.personas + re.personas,
      pendiente: pe.unidades,
      aprobado: ap.unidades,
      rechazado: re.unidades,
      porTipo: porTipo,
      porEstado: {
        aprobado: ap,
        pendiente: pe,
        rechazado: re
      },
      enObservacion: obs,
      duplicados: { porDni: porDni, porPago: porPago },
      dinero: { total: ap.dinero, pendiente: pe.dinero },
      porTipoPago: Object.keys(porTipoPago).map(function (k) {
        return { tipo: k, cantidad: porTipoPago[k].cantidad, monto: porTipoPago[k].monto };
      }).sort(function (a, b) { return b.monto - a.monto; })
    }
  };
}

function duplicadosPorDni_(data, headers) {
  const idxDni = headers.indexOf('DNI');
  const mapa = {};
  for (let i = 1; i < data.length; i++) {
    const dni = String(data[i][idxDni] || '').trim();
    if (/^\d{8}$/.test(dni)) mapa[dni] = (mapa[dni] || 0) + 1;
  }
  return Object.keys(mapa).filter(function (d) { return mapa[d] > 1; })
    .map(function (d) { return { dni: d, veces: mapa[d] }; })
    .sort(function (a, b) { return b.veces - a.veces; });
}

function duplicadosPorPago_(unidades) {
  const mapa = {};
  unidades.forEach(function (u) {
    const ref = String(u.transaccion || '').trim().toUpperCase();
    if (!ref) return;
    if (!mapa[ref]) mapa[ref] = {};
    const clave = (u.esGrupo ? 'g:' : 'i:') + (u.esGrupo ? u.grupoId : u.repId);
    if (mapa[ref][clave] === undefined) mapa[ref][clave] = 1;
  });
  return Object.keys(mapa).map(function (k) {
    return { transaccion: k, unidades: Object.keys(mapa[k]).length };
  }).filter(function (x) { return x.unidades > 1; });
}

function listarInscripciones_(body) {
  const unidades = unidadesDesdeCache_();

  const estadoFiltro = String(body.estado || '').trim().toLowerCase();
  const tipoFiltro = String(body.tipo || '').trim().toLowerCase();
  const vista = String(body.vista || 'todos').trim().toLowerCase(); // 'todos' | 'grupos'
  const pagina = Math.max(1, parseInt(body.pagina, 10) || 1);
  const tamano = Math.min(50, Math.max(1, parseInt(body.tamano, 10) || 20));

  // Búsqueda: sin tildes, varios términos en cualquier orden.
  // "juan perez" o "perez juan" deben encontrar la inscripción.
  const normalizar = function (s) {
    return String(s == null ? '' : s).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };
  const terminos = [];
  String(body.busqueda || '').split(/\s+/).forEach(function (t) {
    const limpio = normalizar(t);
    if (limpio) terminos.push(limpio);
  });
  const coincideTexto = function (txt) {
    if (!terminos.length) return true;
    const n = normalizar(txt);
    return terminos.every(function (t) { return n.indexOf(t) !== -1; });
  };

  const filas = [];
  unidades.forEach(function (u) {
    const estado = u.estado;

    if (estadoFiltro && estado !== estadoFiltro) return;
    if (tipoFiltro && String(u.tipo).toLowerCase() !== tipoFiltro) return;

    // Grupo10
    if (u.esGrupo) {
      if (vista === 'grupos') {
        // Una sola fila: representante + nº de integrantes.
        const textoGrupo = [
          u.repNombres, u.repApellidoPaterno, u.repApellidoMaterno,
          u.repCodigo, u.repDni, u.repId, u.grupoId
        ].join(' ');
        if (!coincideTexto(textoGrupo)) return;
        filas.push({
          id: u.repId,
          grupoId: u.grupoId,
          esGrupo: true,
          cantidad: u.cantidad,
          tipo: u.tipo,
          fecha: u.fecha,
          nombres: u.repNombres,
          apellidos: String(u.repApellidoPaterno || '') + ' ' + String(u.repApellidoMaterno || ''),
          codigo: u.repCodigo,
          universidad: u.repUniversidad,
          dni: u.repDni,
          estado: u.estado,
          monto: u.monto,
          tipoPago: u.tipoPago,
          transaccion: u.transaccion
        });
        return;
      }
      // Vista 'todos': expande a cada integrante y lo filtra individualmente.
      u.integrantes.forEach(function (m) {
        const textoMiembro = [
          m.nombres, m.apPat, m.apMat, m.dni, m.codigo, m.id
        ].join(' ');
        if (!coincideTexto(textoMiembro)) return;
        filas.push({
          id: m.id,
          grupoId: u.grupoId,
          esGrupo: false,
          cantidad: u.cantidad,
          tipo: u.tipo,
          fecha: m.fecha,
          nombres: m.nombres,
          apellidos: String(m.apPat || '') + ' ' + String(m.apMat || ''),
          codigo: m.codigo,
          universidad: m.universidad,
          dni: m.dni,
          estado: m.estado
        });
      });
      return;
    }

    // Registro individual (Estudiante / Egresado)
    const textoIndividual = [
      u.repNombres, u.repApellidoPaterno, u.repApellidoMaterno,
      u.repCodigo, u.repDni, u.repId
    ].join(' ');
    if (!coincideTexto(textoIndividual)) return;
    filas.push({
      id: u.repId,
      grupoId: '',
      esGrupo: false,
      cantidad: 1,
      tipo: u.tipo,
      fecha: u.fecha,
      nombres: u.repNombres,
      apellidos: String(u.repApellidoPaterno || '') + ' ' + String(u.repApellidoMaterno || ''),
      codigo: u.repCodigo,
      universidad: u.repUniversidad,
      dni: u.repDni,
      estado: u.estado,
      monto: u.monto,
      tipoPago: u.tipoPago,
      transaccion: u.transaccion
    });
  });

  // Orden: los más recientes primero (descendente por fecha).
  filas.sort(function (a, b) {
    return fechaMs_(b.fecha) - fechaMs_(a.fecha);
  });

  const totalFiltrado = filas.length;
  const inicio = (pagina - 1) * tamano;
  return {
    ok: true,
    total: totalFiltrado,
    pagina: pagina,
    tamano: tamano,
    vista: vista,
    inscripciones: filas.slice(inicio, inicio + tamano)
  };
}

function fechaMs_(v) {
  const t = new Date(v);
  return isNaN(t.getTime()) ? 0 : t.getTime();
}

function obtenerInscripcion_(body) {
  const id = String(body.id || '').trim();
  const grupoId = String(body.grupoId || '').trim();
  if (!id && !grupoId) return { ok: false, mensaje: 'Falta el ID.' };

  const hoja = hojaInscripcionesValida_();
  const data = hoja.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf('ID');
  const idxGrupo = headers.indexOf('ID de grupo');

  // Pedido por grupo: devuelve el representante + lista de integrantes.
  if (grupoId) {
    const miembros = [];
    let rep = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxGrupo]).trim() !== grupoId) continue;
      const fila = data[i];
      const registro = {};
      headers.forEach(function (h, c) { registro[h] = fila[c]; });
      registro._fila = i + 1;
      if (!rep) rep = registro;
      miembros.push({
        ID: registro.ID,
        Nombres: registro.Nombres,
        ApellidoPaterno: registro['Apellido paterno'],
        ApellidoMaterno: registro['Apellido materno'],
        DNI: registro.DNI,
        Código: registro.Código,
        Estado: registro['Estado'],
        _fila: registro._fila
      });
    }
    if (!rep) return { ok: false, mensaje: 'No se encontró el grupo.' };

    let voucherBase64 = null;
    let voucher2Base64 = null;
    const voucherUrl = String(rep.Voucher || '').trim();
    if (voucherUrl) {
      try {
        const partes = voucherUrl.split(/[\n,;]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x; });
        if (partes.length >= 1) voucherBase64 = voucherComoBase64_(partes[0]);
        if (partes.length >= 2) voucher2Base64 = voucherComoBase64_(partes[1]);
      } catch (e) { voucherBase64 = null; voucher2Base64 = null; }
    }
    if (!voucher2Base64) {
      const voucher2Url = String(rep.Voucher2 || '').trim();
      if (voucher2Url) { try { voucher2Base64 = voucherComoBase64_(voucher2Url); } catch (e) {} }
    }

    return {
      ok: true,
      esGrupo: true,
      inscripcion: rep,
      miembros: miembros,
      voucherBase64: voucherBase64,
      voucher2Base64: voucher2Base64
    };
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxId]).trim() !== id) continue;
    const fila = data[i];
    const registro = {};
    headers.forEach(function (h, c) { registro[h] = fila[c]; });
    registro._fila = i + 1;

    // Si el individuo pertenece a un grupo, se devuelven todos sus miembros.
    const grupoDet = String(registro['ID de grupo'] || '').trim();
    const perteneceGrupo = grupoDet !== '' && String(registro['Tipo']).trim() !== 'Grupo10';
    let miembros = [];
    if (perteneceGrupo) {
      for (let j = 1; j < data.length; j++) {
        if (String(data[j][idxGrupo]).trim() !== grupoDet) continue;
        const mFila = data[j];
        const mReg = {};
        headers.forEach(function (h, c) { mReg[h] = mFila[c]; });
        miembros.push({
          ID: mReg.ID,
          Nombres: mReg.Nombres,
          ApellidoPaterno: mReg['Apellido paterno'],
          ApellidoMaterno: mReg['Apellido materno'],
          DNI: mReg.DNI,
          Código: mReg.Código,
          Estado: mReg['Estado']
        });
      }
    }

    // Voucher: la celda guarda la URL completa del archivo de Drive.
    let voucherBase64 = null;
    let voucher2Base64 = null;
    const voucherUrl = String(registro.Voucher || '').trim();
    if (voucherUrl) {
      try {
        const partes = voucherUrl.split(/[\n,;]+/).map(function (x) { return x.trim(); }).filter(function (x) { return x; });
        if (partes.length >= 1) voucherBase64 = voucherComoBase64_(partes[0]);
        if (partes.length >= 2) voucher2Base64 = voucherComoBase64_(partes[1]);
      } catch (e) { voucherBase64 = null; voucher2Base64 = null; }
    }
    if (!voucher2Base64) {
      const voucher2Url = String(registro.Voucher2 || '').trim();
      if (voucher2Url) { try { voucher2Base64 = voucherComoBase64_(voucher2Url); } catch (e) {} }
    }

    return {
      ok: true,
      esGrupo: false,
      inscripcion: registro,
      perteneceGrupo: perteneceGrupo,
      grupoId: grupoDet,
      miembros: miembros,
      voucherBase64: voucherBase64,
      voucher2Base64: voucher2Base64
    };
  }
  return { ok: false, mensaje: 'No se encontró la inscripción.' };
}

/** Elimina la URL del voucher de una inscripción (borra la celda indicada).
 * body: { id, cual: 'Voucher' | 'Voucher2' | undefined }
 */
function borrarVoucher_(body) {
  const id = String(body.id || '').trim();
  const cual = String(body.cual || 'Voucher');
  const nom = cual === 'Voucher2' ? 'Voucher2' : 'Voucher';
  const hoja = hojaInscripcionesValida_();
  const data = hoja.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf('ID');
  const idxVoucher = headers.indexOf(nom);

  if (idxVoucher < 0) return { ok: false, mensaje: 'Columna ' + nom + ' no existe. Actualiza el script.' };

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxId]).trim() !== id) continue;
    hoja.getRange(i + 1, idxVoucher + 1).setValue('');
    return { ok: true, mensaje: 'Voucher eliminado (' + nom + ').' };
  }
  return { ok: false, mensaje: 'Inscripción no encontrada.' };
}

function cambiarEstado_(sesion, body) {
  const id = String(body.id || '').trim();
  const nuevoEstado = String(body.estado || '').trim().toLowerCase();

  if (!id) return { ok: false, mensaje: 'Falta el ID.' };
  if (ESTADOS_VALIDOS.indexOf(nuevoEstado) === -1) {
    return { ok: false, mensaje: 'Estado inválido.' };
  }

  // Al aprobar solo se exige el tipo de pago. El monto y el n.º de
  // voucher/transacción son opcionales: permiten aprobar entradas ganadas
  // o gratuitas sin comprobante (monto 0 y transacción vacía o "Libre").
  if (nuevoEstado === 'aprobado') {
    const tpAprobar = String(body.tipoPago || '').trim();
    if (!tpAprobar) return { ok: false, mensaje: 'Para aprobar, indica el tipo de pago.' };
    if (tpAprobar.length > 80) {
      return { ok: false, mensaje: 'El tipo de pago es demasiado largo (máx. 80 caracteres).' };
    }
    const montoAprobar = parsearNumero_(body.montoVerificado);
    if (montoAprobar < 0) return { ok: false, mensaje: 'El monto no puede ser negativo.' };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return { ok: false, mensaje: 'Sistema ocupado, intenta de nuevo.' };
  }

  try {
    const hoja = hojaInscripcionesValida_();
    const data = hoja.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('ID');
    const idxEstado = headers.indexOf('Estado');
    const idxGrupo = headers.indexOf('ID de grupo');
    const idxTipo = headers.indexOf('Tipo');
    const idxMonto = headers.indexOf('MontoVerificado');
    const idxPago = headers.indexOf('TipoPago');
    const idxTrans = headers.indexOf('NumeroTransaccion');
    const idxMotivo = headers.indexOf('MotivoRechazo');

    // Localiza la fila objetivo.
    let filasObj = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxId]).trim() !== id) continue;
      const tipo = String(data[i][idxTipo]).trim();
      const grupoId = String(data[i][idxGrupo]).trim();
      if (tipo === 'Grupo10' && grupoId) {
        // Grupo: cambia el estado de TODOS los integrantes (comparten voucher).
        for (let j = 1; j < data.length; j++) {
          if (String(data[j][idxGrupo]).trim() === grupoId) filasObj.push(j + 1);
        }
      } else {
        filasObj.push(i + 1);
      }
      break;
    }

    if (filasObj.length === 0) return { ok: false, mensaje: 'Inscripción no encontrada.' };

    filasObj.forEach(function (fila) {
      hoja.getRange(fila, idxEstado + 1).setValue(nuevoEstado);
      // Al aprobar se registran (o reemplazan) los datos de pago verificados.
      if (nuevoEstado === 'aprobado') {
        hoja.getRange(fila, idxMonto + 1).setValue(String(body.montoVerificado || '0').trim() || '0');
        hoja.getRange(fila, idxPago + 1).setValue(String(body.tipoPago).trim());
        hoja.getRange(fila, idxTrans + 1).setValue(String(body.numeroTransaccion || '').trim());
        if (idxMotivo >= 0) hoja.getRange(fila, idxMotivo + 1).setValue('');
      }
      // Al rechazar se guarda el motivo en la columna MotivoRechazo (la lee la consulta pública).
      if (nuevoEstado === 'rechazado' && idxMotivo >= 0) {
        hoja.getRange(fila, idxMotivo + 1).setValue(String(body.motivo || '').trim());
      }
    });
    const mensaje = filasObj.length > 1
      ? 'Grupo actualizado (' + filasObj.length + ' integrantes) a "' + nuevoEstado + '".'
      : 'Estado actualizado a "' + nuevoEstado + '".';
    return { ok: true, mensaje: mensaje };
  } catch (err) {
    return { ok: false, mensaje: 'Error al actualizar: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function exportarInscritos_() {
  const hoja = hojaInscripcionesValida_();
  const data = hoja.getDataRange().getValues();
  const csv = data.map(function (fila) {
    return fila.map(function (celda) {
      const s = String(celda);
      return '"' + s.replace(/"/g, '""') + '"';
    }).join(',');
  }).join('\r\n');

  // El frontend recibe el texto y lanza la descarga local.
  return { ok: true, csv: '\uFEFF' + csv };
}

/**
 * ELIMINACIÓN: mueve la fila completa a la hoja "Eliminados" (con
 * MotivoEliminados adicional) y la borra de "Inscripciones".
 * La hoja Eliminados repite los 18 encabezados de Inscripciones
 * (conservando MotivoRechazo) y agrega MotivoEliminados.
 */
const ELIMINADOS_COLS = [
  'ID', 'ID de grupo', 'Fecha', 'Tipo', 'Nombres', 'Apellido paterno',
  'Apellido materno', 'Código', 'Universidad', 'Facultad / Institución',
  'DNI', 'Celular', 'Voucher', 'Estado', 'MontoVerificado', 'TipoPago',
  'NumeroTransaccion', 'MotivoRechazo', 'MotivoEliminados', 'Voucher2'
];

function eliminarInscripcion_(sesion, body) {
  const id = String(body.id || '').trim();
  const motivo = String(body.motivo || '').trim();
  if (!id) return { ok: false, mensaje: 'Falta el ID.' };
  if (!motivo) return { ok: false, mensaje: 'Indica el motivo de la eliminación.' };

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, mensaje: 'Sistema ocupado, intenta de nuevo.' };

  try {
    const libro = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const hoja = libro.getSheetByName(CONFIG.HOJA_INSCRIPCIONES);
    const data = hoja.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('ID');
    const idxGrupo = headers.indexOf('ID de grupo');
    const idxTipo = headers.indexOf('Tipo');

    // Localiza la fila objetivo y, si es Grupo10, todas las de su grupo.
    const filasOrigen = []; // { filaExcel, filaDatos }
    let esGrupo = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idxId]).trim() !== id) continue;
      const tipo = String(data[i][idxTipo]).trim();
      const grupoId = String(data[i][idxGrupo]).trim();
      if (tipo === 'Grupo10' && grupoId) {
        esGrupo = true;
        for (let j = 1; j < data.length; j++) {
          if (String(data[j][idxGrupo]).trim() === grupoId) {
            filasOrigen.push({ ex: j + 1, datos: data[j] });
          }
        }
      } else {
        filasOrigen.push({ ex: i + 1, datos: data[i] });
      }
      break;
    }

    if (filasOrigen.length === 0) return { ok: false, mensaje: 'Inscripción no encontrada.' };

    // Hoja Eliminados con su propio encabezado (19 columnas).
    let hojaElim = libro.getSheetByName(CONFIG.HOJA_ELIMINADOS);
    if (!hojaElim) {
      hojaElim = libro.insertSheet(CONFIG.HOJA_ELIMINADOS);
      hojaElim.getRange(1, 1, 1, ELIMINADOS_COLS.length).setValues([ELIMINADOS_COLS]);
      hojaElim.setFrozenRows(1);
    }

    const motivoReg = (motivo || '') + (sesion && sesion.usuario ? ' (por ' + sesion.usuario + ')' : '');

    filasOrigen.forEach(function (f) {
      const filaNueva = ELIMINADOS_COLS.map(function (nombre) {
        if (nombre === 'MotivoEliminados') return motivoReg;
        if (nombre === 'MotivoRechazo') return ''; // ya no existe en Inscripciones
        const idxOrigen = headers.indexOf(nombre);
        return idxOrigen >= 0 ? f.datos[idxOrigen] : '';
      });
      hojaElim.appendRow(filaNueva);
    });

    // Borra de abajo hacia arriba para no desalinear índices.
    filasOrigen.map(function (f) { return f.ex; })
      .sort(function (a, b) { return b - a; })
      .forEach(function (ex) { hoja.deleteRow(ex); });

    const mensaje = esGrupo
      ? 'Grupo eliminado (' + filasOrigen.length + ' integrantes movidos a Eliminados).'
      : 'Inscripción movida a Eliminados.';
    return { ok: true, mensaje: mensaje };
  } catch (err) {
    return { ok: false, mensaje: 'Error al eliminar: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function obtenerEstadisticas_() {
  const resumen = obtenerResumen_().resumen;
  const hoja = hojaInscripcionesValida_();
  const data = hoja.getDataRange().getValues();
  const headers = data[0];
  const porUniversidad = {};
  const porFacultad = {};
  const porDia = {};

  const idxU = headers.indexOf('Universidad');
  const idxF = headers.indexOf('Facultad / Institución');
  const idxFecha = headers.indexOf('Fecha');
  const idxE = headers.indexOf('Estado');
  const idxT = headers.indexOf('Tipo');

  for (let i = 1; i < data.length; i++) {
    const uni = String(data[i][idxU] || '').trim() || 'Sin especificar';
    const fac = String(data[i][idxF] || '').trim() || 'Sin especificar';
    porUniversidad[uni] = (porUniversidad[uni] || 0) + 1;
    porFacultad[fac] = (porFacultad[fac] || 0) + 1;

    const f = data[i][idxFecha];
    if (f instanceof Date) {
      const clave = Utilities.formatDate(f, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      porDia[clave] = (porDia[clave] || 0) + 1;
    }
  }

  const topUniversidades = Object.keys(porUniversidad)
    .map(function (k) { return { nombre: k, cantidad: porUniversidad[k] }; })
    .sort(function (a, b) { return b.cantidad - a.cantidad; })
    .slice(0, 10);

  return {
    ok: true,
    resumen: resumen,
    topUniversidades: topUniversidades,
    subirPorDia: porDia
  };
}

// ---------- Helpers del voucher ----------

function voucherComoBase64_(url) {
  if (!url) return null;
  var ef = DriveApp.getFileById(extraerIdDrive_(url));
  var blob = ef.getBlob();
  var mime = blob.getContentType();
  var b64 = Utilities.base64Encode(blob.getBytes());
  return { mimeType: mime, base64: b64, nombre: ef.getName() };
}

function extraerIdDrive_(url) {
  var u = String(url || '').trim();
  var m = u.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (m && m[1]) return m[1];
  var p = u.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (p && p[1]) return p[1];
  return u;
}

/**
 * Registro manual (desde el panel). Añade una fila con estado 'aprobado'
 * por defecto. El voucher puede ser URL de Drive o data URL base64.
 */
/**
 * Edita campos de una inscripción por su ID de fila (o por grupo, si
 * viene grupoId). Permite corregir datos mal llenados (código, etc.).
 * Campos permitidos: nombres, apellidoPaterno, apellidoMaterno, codigo,
 * universidad, facultadInstitucion, dni, celular, montoVerificado,
 * tipoPago, numeroTransaccion.
 */
function editarInscripcion_(body) {
  const id = String(body.id || '').trim();
  const grupoId = String(body.grupoId || '').trim();
  const campos = body.campos || {};
  if (!id && !grupoId) return { ok: false, mensaje: 'Falta el ID.' };

  const permitidos = {
    nombres: 'Nombres',
    apellidoPaterno: 'Apellido paterno',
    apellidoMaterno: 'Apellido materno',
    codigo: 'Código',
    universidad: 'Universidad',
    facultadInstitucion: 'Facultad / Institución',
    dni: 'DNI',
    celular: 'Celular',
    montoVerificado: 'MontoVerificado',
    tipoPago: 'TipoPago',
    numeroTransaccion: 'NumeroTransaccion'
  };

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, mensaje: 'Sistema ocupado, intenta de nuevo.' };

  try {
    const hoja = hojaInscripcionesValida_();
    const data = hoja.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.indexOf('ID');
    const idxGrupo = headers.indexOf('ID de grupo');

    // Filas objetivo: el id dado, o todas las del grupo.
    const filasObj = [];
    for (let i = 1; i < data.length; i++) {
      if (grupoId) {
        if (String(data[i][idxGrupo]).trim() === grupoId) filasObj.push(i + 1);
      } else if (String(data[i][idxId]).trim() === id) {
        filasObj.push(i + 1);
      }
    }
    if (filasObj.length === 0) return { ok: false, mensaje: 'Inscripción no encontrada.' };

    Object.keys(campos).forEach(function (k) {
      const nombreCol = permitidos[k];
      if (!nombreCol) return;
      const idx = headers.indexOf(nombreCol);
      if (idx < 0) return;
      hoja.getRange(filasObj[0], idx + 1).setValue(campos[k]);
    });

    // Si se corrigió el DNI de un grupo, propagar a todos los integrantes
    // solo si era un error común: no propagamos por seguridad.
    const mensaje = filasObj.length > 1
      ? 'Grupo actualizado (' + filasObj.length + ' filas).'
      : 'Inscripción actualizada.';
    return { ok: true, mensaje: mensaje };
  } catch (err) {
    return { ok: false, mensaje: 'Error al actualizar: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function registrarManual_(body) {
  var d = body.datos || {};
  var tipo = String(d.tipo || '').trim();
  if (['Estudiante', 'Grupo10', 'Egresado'].indexOf(tipo) === -1) {
    return { ok: false, mensaje: 'Tipo de inscripción inválido.' };
  }

  var integrantes = [];
  if (tipo === 'Grupo10') {
    integrantes = Array.isArray(d.integrantes) ? d.integrantes : [];
    if (integrantes.length !== 10) {
      return { ok: false, mensaje: 'Un Grupo de 10 debe tener exactamente 10 integrantes (ingresaste ' + integrantes.length + ').' };
    }
    for (var q = 0; q < integrantes.length; q++) {
      var mi = integrantes[q] || {};
      if (!/^\d{8}$/.test(String(mi.dni || '').trim())) return { ok: false, mensaje: 'Integrante N°' + (q + 1) + ': DNI inválido.' };
      if (!String(mi.nombres || '').trim()) return { ok: false, mensaje: 'Integrante N°' + (q + 1) + ': falta el nombre.' };
    }
  } else {
    var dni = String(d.dni || '').trim();
    if (!/^\d{8}$/.test(dni)) return { ok: false, mensaje: 'DNI inválido.' };
    if (!String(d.nombres || '').trim()) return { ok: false, mensaje: 'Falta el nombre.' };
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false, mensaje: 'Sistema ocupado.' };

  try {
    var hoja = hojaInscripcionesValida_();
    var voucherUrl = '';
    if (String(d.voucher || '').indexOf('data:') === 0) {
      voucherUrl = guardarVoucherManualmente_(d.voucher, tipo + '_' + (tipo === 'Grupo10' ? 'grupo' : dni));
    } else {
      voucherUrl = String(d.voucher || '').trim();
    }

    var grupoId = tipo === 'Grupo10' ? Utilities.getUuid() : '';

    var fila = function (m) {
      hoja.appendRow([
        Utilities.getUuid(), grupoId, new Date(), tipo,
        m.nombres,
        m.apellidoPaterno || '',
        m.apellidoMaterno || '',
        m.codigo || '',
        m.universidad || '',
        m.facultad || m.facultadInstitucion || '',
        String(m.dni).trim(),
        m.celular || '',
        voucherUrl,
        'aprobado',
        d.montoVerificado || '',
        d.tipoPago || '',
        d.numeroTransaccion || ''
      ]);
    };

    if (tipo === 'Grupo10') {
      integrantes.forEach(fila);
      return { ok: true, mensaje: 'Grupo de 10 registrado (' + integrantes.length + ' integrantes).' };
    }

    fila({
      nombres: d.nombres,
      apellidoPaterno: d.apellidoPaterno,
      apellidoMaterno: d.apellidoMaterno,
      codigo: d.codigo,
      universidad: d.universidad,
      facultad: d.facultadInstitucion,
      dni: dni,
      celular: d.celular
    });
    return { ok: true, mensaje: 'Inscripción registrada correctamente.' };
  } catch (err) {
    return { ok: false, mensaje: 'Error al registrar: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function guardarVoucherManualmente_(base64Data, nombreBase) {
  var carpeta = DriveApp.getFolderById(CONFIG.CARPETA_VOUCHERS_ID);
  var partes = base64Data.split(',');
  var tipoMime = partes[0].match(/:(.*?);/)[1];
  var bytes = Utilities.base64Decode(partes[1]);
  var blob = Utilities.newBlob(bytes, tipoMime, nombreBase.replace(/[^a-zA-Z0-9 -]/g, '') + ' - voucher');
  var archivo = carpeta.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return archivo.getUrl();
}
/**
 * Sube un segundo voucher (Voucher2) para una inscripción por ID.
 * body: { id, voucher (data URL base64) }
 */
function subirVoucher2_(body) {
  const id = String(body.id || '').trim();
  const voucherData = String(body.voucher || '');
  if (!id) return { ok: false, mensaje: 'Falta el ID.' };
  if (voucherData.indexOf('data:') !== 0) {
    return { ok: false, mensaje: 'El voucher2 debe ser un archivo en formato base64 (data URL).' };
  }
  const hoja = hojaInscripcionesValida_();
  const data = hoja.getDataRange().getValues();
  const headers = data[0];
  const idxId = headers.indexOf('ID');
  const idxV2 = headers.indexOf('Voucher2');
  if (idxV2 < 0) {
    return { ok: false, mensaje: 'La columna Voucher2 no existe. Revisa el encabezado.' };
  }
  let dni = '';
  let nombreBase = 'voucher2';
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idxId]).trim() === id) {
      dni = String(data[i][headers.indexOf('DNI')] || '').trim();
      const nom = String(data[i][headers.indexOf('Nombres')] || '').trim();
      nombreBase = 'insc_' + (dni || id.substring(0, 8)) + '_' + (nom || 'voucher2');
      const url = guardarVoucherManualmente_(voucherData, nombreBase);
      hoja.getRange(i + 1, idxV2 + 1).setValue(url);
      return { ok: true, mensaje: 'Voucher2 guardado.', url: url };
    }
  }
  return { ok: false, mensaje: 'Inscripción no encontrada.' };
}
