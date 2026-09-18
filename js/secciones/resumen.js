// Sección Resumen: bloques priorizados por estado, grupo/unidad, observación y duplicados.
(function () {
  let cargado = false;

  const S = function (n) { return Number(n || 0).toLocaleString('es-PE'); };
  const mv = function (n) { return 'S/ ' + S(n); };

  function chip(txt) {
    return '<span class="chip-resumen">' + txt + '</span>';
  }

  function bloqueEstado(titulo, c, cls, dinero, fondoSolido) {
    const kpi = String(c.personas);
    const kpiSub = (c.unidades === c.personas
      ? c.unidades + ' unidad' + (c.unidades === 1 ? '' : 'es')
      : c.personas + ' persona' + (c.personas === 1 ? '' : 's')) + ' · ' + c.unidades + ' unidad' + (c.unidades === 1 ? '' : 'es');
    const chips = [];
    if (c.individuales) chips.push(c.individuales + ' individual' + (c.individuales === 1 ? '' : 'es'));
    if (c.grupos) chips.push(c.grupos + ' grupo' + (c.grupos === 1 ? '' : 's') + ' de 10 (' + c.personasGrupos + ' pers.)');
    if (dinero !== undefined) chips.push(mv(dinero) + ' verificados');
    return (
      '<div class="bloque-resumen ' + cls + '">' +
        '<div class="bloque-cabecera"><span class="bloque-titulo">' + titulo + '</span></div>' +
        '<div class="bloque-cuerpo">' +
          '<div class="bloque-kpi ' + fondoSolido + '"><span class="bloque-numero">' + S(kpi) + '</span>' +
            '<span class="bloque-unidad">personas</span></div>' +
          '<p class="bloque-sub">' + kpiSub + '</p>' +
          '<div class="bloque-chips">' + chips.map(chip).join('') + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  async function cargar() {
    const cont = document.getElementById('seccion-resumen');
    cont.innerHTML =
      '<h2 class="seccion-titulo">Resumen</h2>' +
      '<p class="seccion-sub">Estado general de las inscripciones y recaudación</p>' +
      '<div id="resumenBloques"></div>';

    const r = await apiLlamada('resumen');
    const caja = document.getElementById('resumenBloques');
    if (!r.ok) {
      caja.innerHTML = '<div class="alerta alerta-error">' + (r.mensaje || 'Error') + '</div>';
      return;
    }

    const s = r.resumen;
    const e = s.porEstado || {};
    const html = [];

    // Bloque principal: aprobados.
    html.push('<h3 class="resumen-grupo-titulo">Aprobados</h3>');
    html.push(bloqueEstado('Inscritos aprobados', e.aprobado || {}, 'bloque-aprobado', s.dinero.total));

    // Pendientes.
    html.push('<h3 class="resumen-grupo-titulo" style="margin-top:26px">Por revisar</h3>');
    html.push(bloqueEstado('Pendientes de revisión', e.pendiente || {}, 'bloque-pendiente', s.dinero.pendiente));

    // Composición: tipos, grupos y rechazados.
    html.push('<h3 class="resumen-grupo-titulo" style="margin-top:26px">Composición</h3>');
    html.push('<div class="resumen-minigrid">');
    (s.porTipo ? Object.keys(s.porTipo) : []).forEach(function (t) {
      const cls = String(t).toLowerCase() === 'grupo10' ? 'minigrupo' : 'miniindiv';
      html.push(
        '<div class="mini-resumen ' + cls + '">' +
          '<span class="mini-numero">' + S(s.porTipo[t]) + '</span>' +
          '<span class="mini-etiqueta">' + t + '</span>' +
        '</div>'
      );
    });
    const re = e.rechazado || {};
    html.push(
      '<div class="mini-resumen mini-rechazado">' +
        '<span class="mini-numero">' + S(re.personas) + '</span>' +
        '<span class="mini-etiqueta">Rechazados</span>' +
      '</div>'
    );
    html.push('</div>');

    // En observación.
    const obs = s.enObservacion || { unidades: 0, porProblema: {} };
    html.push('<h3 class="resumen-grupo-titulo" style="margin-top:26px">En observación</h3>');
    html.push(
      '<div class="bloque-resumen bloque-observacion">' +
        '<div class="bloque-cabecera"><span class="bloque-titulo">Inscritos sin datos de pago claros</span></div>' +
        '<div class="bloque-cuerpo">' +
          '<div class="bloque-kpi kpi-obs"><span class="bloque-numero">' + S(obs.unidades) + '</span>' +
            '<span class="bloque-unidad">unidad' + (obs.unidades === 1 ? '' : 'es') + '</span></div>' +
          '<div class="bloque-chips">' +
            chip(obs.porProblema.sinMonto + ' sin monto') +
            chip(obs.porProblema.sinTipoPago + ' sin tipo de pago') +
            chip(obs.porProblema.sinTransaccion + ' sin n.º de transacción') +
          '</div>' +
        '</div>' +
      '</div>'
    );

    // Duplicados.
    const dup = s.duplicados || { porDni: [], porPago: [] };
    html.push('<h3 class="resumen-grupo-titulo" style="margin-top:26px">Duplicados</h3>');
    if (!dup.porDni.length && !dup.porPago.length) {
      html.push('<div class="bloque-resumen bloque-duplicados"><p class="bloque-vacio">Sin duplicados detectados.</p></div>');
    } else {
      html.push('<div class="bloque-resumen bloque-duplicados"><div class="bloque-cuerpo">');
      if (dup.porDni.length) {
        html.push('<p class="bloque-sub" style="margin-bottom:6px">Mismo DNI registrado varias veces:</p>');
        html.push('<div class="bloque-chips">' +
          dup.porDni.slice(0, 12).map(function (d) { return chip(d.dni + ' ×' + d.veces); }).join('') +
          (dup.porDni.length > 12 ? chip('+' + (dup.porDni.length - 12) + ' más') : '') +
        '</div>');
      }
      if (dup.porPago.length) {
        html.push(dup.porDni.length ? '<p class="bloque-sub" style="margin:10px 0 6px">N.º de transacción compartido entre inscripciones:</p>' : '');
        html.push('<div class="bloque-chips">' +
          dup.porPago.slice(0, 12).map(function (p) { return chip(p.transaccion + ' en ' + p.unidades); }).join('') +
          (dup.porPago.length > 12 ? chip('+' + (dup.porPago.length - 12) + ' más') : '') +
        '</div>');
      }
      html.push('</div></div>');
    }

    // Pagos aprobados (desglose).
    const pagos = s.porTipoPago || [];
    if (pagos.length) {
      html.push('<h3 class="resumen-grupo-titulo" style="margin-top:26px">Pagos aprobados</h3>');
      html.push(
        '<div class="tabla-envoltorio">' +
          '<table class="tabla">' +
            '<thead><tr><th>Tipo de pago</th><th>Cantidad</th><th>Monto</th></tr></thead>' +
            '<tbody>' +
              pagos.map(function (p) {
                return '<tr><td>' + p.tipo + '</td><td>' + p.cantidad + '</td><td>' + mv(p.monto) + '</td></tr>';
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>'
      );
    }

    caja.innerHTML = html.join('');
    cargado = true;
  }

  window.SeccionResumen = {
    mostrar: function () {
      if (!cargado) cargar();
    },
    refrescar: function () { cargar(); }
  };
})();