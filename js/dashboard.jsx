/* ====================================================================== */
/*  Tablero de deserción, permanencia y graduación — SPADIES 3.0          */
/*  Universidad Nacional de Colombia · Sede Medellín                      */
/*                                                                        */
/*  Este archivo se transpila en el navegador con Babel standalone.       */
/*  Los datos provienen de los módulos declarados en datos/*.js y se      */
/*  consultan a través del objeto global window.SPADIES.                  */
/* ====================================================================== */

const { useState, useMemo, useRef, useEffect } = React;

const D = window.SPADIES;
const DEF = D.definiciones;

/* ------------------------------------------------------------ formatos */
const fNum = new Intl.NumberFormat('es-CO');
const fEnt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

const vacio = v => v === null || v === undefined;
const num = v => (vacio(v) ? '—' : fEnt.format(v));
const pct = (v, n = 2) => (vacio(v) ? '—' : v.toFixed(n).replace('.', ',') + ' %');
const pp = v =>
  vacio(v) ? '—' : (v > 0 ? '+' : '') + v.toFixed(2).replace('.', ',') + ' p.p.';

/* ------------------------------------------------ facultades y programas */

/* Catálogo de pregrado de la sede y módulos de datos por programa. Si los
   archivos no están presentes el tablero funciona igual, sin esta consulta. */
const CAT = D.programas || null;

const MODULOS = {
  desercionAnual: 'progDesercionAnual',
  desercionCohorte: 'progDesercionCohorte',
  desercionPromedioAcumulada: 'progDesercionPromedioAcumulada',
  graduacionAcumulada: 'progGraduacionAcumulada',
  ausenciaIntersemestral: 'progAusenciaIntersemestral',
  supervivencia: 'progSupervivencia'
};

/* Las claves de serie llevan prefijo para no chocar con los códigos de sede. */
const CLAVE_FAC = 'F:';
const CLAVE_PRO = 'P:';

/* Las series se dibujan igual que las de sede: el único distintivo es el color,
   con tonos azules para las facultades y la rampa verde institucional para los
   programas. El color depende de la posición en el catálogo y no del orden en
   que se eligen, de modo que un programa conserva su color al agregar o quitar
   otros. */
const COLORES_FAC = ['#2ba6cb', '#3d4041', '#4fc5e9', '#289a64', '#4e5254'];
const COLORES_PRO = [
  '#677d29', '#d49d00', '#c9a227', '#87a436', '#8a6d1f', '#1b6f8c',
  '#a2a3a4', '#4a5c1d', '#b0cc6a', '#6f7275', '#242627', '#3f7d5a'
];

const esFacultad = k => !!k && k.slice(0, 2) === CLAVE_FAC;

const datosProg = pest => (CAT && MODULOS[pest.id] ? D[MODULOS[pest.id]] : null) || null;

const facultadDe = cod =>
  (CAT ? CAT.facultades.filter(f => f.codigo === cod)[0] : null) || null;

const programasDe = cod => {
  const f = facultadDe(cod);
  return f ? f.programas : [];
};

/* Filtros en cascada: el selector de programas solo ofrece los de las
   facultades marcadas, en el orden del catálogo. */
const programasVisibles = filtros =>
  (CAT ? CAT.facultades : [])
    .filter(f => filtros.facultades.indexOf(f.codigo) >= 0)
    .reduce((a, f) => a.concat(f.programas), []);

/* Orden del catálogo: fija el color de cada facultad y de cada programa. */
const ORDEN_PRO = CAT
  ? CAT.facultades.reduce((a, f) => a.concat(f.programas), [])
  : [];

const meta = k => {
  if (DEF.entidades[k]) return DEF.entidades[k];
  if (CAT && esFacultad(k)) {
    const cod = k.slice(2);
    const f = facultadDe(cod);
    if (!f) return {};
    let i = 0;
    CAT.facultades.forEach((x, j) => { if (x.codigo === cod) i = j; });
    return {
      nombre: f.nombre, corto: f.nombre,
      color: COLORES_FAC[i % COLORES_FAC.length]
    };
  }
  if (CAT && k && k.slice(0, 2) === CLAVE_PRO) {
    const cod = k.slice(2);
    const p = CAT.catalogo[cod];
    if (!p) return {};
    const i = Math.max(0, ORDEN_PRO.indexOf(cod));
    return {
      nombre: p.nombre, corto: p.nombre,
      color: COLORES_PRO[i % COLORES_PRO.length]
    };
  }
  return {};
};

const color = k => meta(k).color || '#a2a3a4';

/* Con más programas que colores en la rampa, los siguientes se dibujan con
   trazo discontinuo para que no se confundan con los primeros. */
const trazoDe = k => {
  if (!k || k.slice(0, 2) !== CLAVE_PRO) return 'solid';
  const i = ORDEN_PRO.indexOf(k.slice(2));
  return i >= COLORES_PRO.length * 2 ? 'dotted'
    : i >= COLORES_PRO.length ? 'dashed' : 'solid';
};
const rotulo = k => meta(k).corto || k;
const nombre = k => meta(k).nombre || k;

/* --------------------------------------------------------- descargas */

/** Convierte a texto CSV apto para Excel en español y dispara la descarga. */
function descargarCsv(nombreArchivo, encabezados, filas) {
  const celda = v => {
    if (vacio(v)) return '';
    if (typeof v === 'number') return String(v).replace('.', ',');
    const t = String(v);
    return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const texto = [encabezados].concat(filas)
    .map(f => f.map(celda).join(';')).join('\r\n');
  // El BOM evita que Excel muestre las tildes corrompidas.
  const blob = new Blob(['\ufeff' + texto], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const nombreArchivo = partes =>
  partes.filter(Boolean).map(clave).join('_').replace(/^t-/, '').replace(/_t-/g, '_');

/** Guarda el gráfico como PNG anteponiendo el título y la fuente. */
function descargarPng(ec, nombreSalida, titulo) {
  const pr = 3;
  const base = ec.getDataURL({ type: 'png', pixelRatio: pr, backgroundColor: '#fff' });
  const img = new Image();
  img.onload = function () {
    const cabecera = 74 * pr;
    const pie = 34 * pr;
    const margen = 20 * pr;
    const lienzo = document.createElement('canvas');
    lienzo.width = img.width;
    lienzo.height = img.height + cabecera + pie;
    const c = lienzo.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, lienzo.width, lienzo.height);

    c.textBaseline = 'middle';
    c.fillStyle = '#242627';
    c.font = '600 ' + 15 * pr + 'px ' + TIPO_LETRA;
    c.fillText(titulo, margen, 30 * pr);

    c.fillStyle = '#677d29';
    c.font = '600 ' + 10 * pr + 'px ' + TIPO_LETRA;
    c.fillText('UNIVERSIDAD NACIONAL DE COLOMBIA · SEDE MEDELLÍN', margen, 54 * pr);

    c.strokeStyle = '#dcdcdc';
    c.lineWidth = 1 * pr;
    c.beginPath();
    c.moveTo(margen, cabecera - 6 * pr);
    c.lineTo(lienzo.width - margen, cabecera - 6 * pr);
    c.stroke();

    c.drawImage(img, 0, cabecera);

    c.fillStyle = '#a2a3a4';
    c.font = 10 * pr + 'px ' + TIPO_LETRA;
    c.fillText(DEF.nota, margen, img.height + cabecera + pie / 2);

    const a = document.createElement('a');
    a.href = lienzo.toDataURL('image/png');
    a.download = nombreSalida + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  img.src = base;
}

/** Botones de descarga del encabezado de tarjeta. */
function Descargas({ csv, instancia, nombre, titulo }) {
  return (
    <span className="dsh-acc">
      {csv ? (
        <button type="button" className="dsh-ico" title="Descargar los datos en CSV"
          aria-label="Descargar los datos en CSV"
          onClick={() => {
            const d = csv();
            if (d) descargarCsv(nombre, d.encabezados, d.filas);
          }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v10.2l3.6-3.6L17 11l-5 5-5-5 1.4-1.4L12 13.2V3h0ZM5 18h14v2H5v-2Z" />
          </svg>
        </button>
      ) : null}
      {instancia ? (
        <button type="button" className="dsh-ico" title="Descargar el gráfico en PNG"
          aria-label="Descargar el gráfico en PNG"
          onClick={() => {
            const ec = instancia.current;
            if (!ec) return;
            descargarPng(ec, nombre, titulo);
          }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 12h14l-4.5-6-3.5 4.5-2.2-2.7L5 17Zm3.2-6.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z" />
          </svg>
        </button>
      ) : null}
    </span>
  );
}

/** Índice del último valor no vacío de una serie. */
const ultimo = serie => {
  for (let i = (serie || []).length - 1; i >= 0; i--) {
    if (!vacio(serie[i])) return i;
  }
  return -1;
};

const clave = t =>
  't-' +
  String(t).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ==================================================================== */
/*  Configuración de las pestañas                                        */
/* ==================================================================== */

const PESTANAS = [
  {
    id: 'desercionAnual',
    rotulo: 'Deserción anual',
    tipo: 'periodo',
    numerador: 'desertores',
    denominador: 'matriculados',
    rotNum: 'Desertores',
    rotDen: 'Matriculados',
    rotTasa: 'Tasa de deserción anual'
  },
  {
    id: 'desercionCohorte',
    rotulo: 'Deserción por cohorte',
    tipo: 'cohorte'
  },
  {
    id: 'desercionPromedioAcumulada',
    rotulo: 'Deserción promedio acumulada',
    tipo: 'semestre',
    rotNum: 'Desertores acumulados',
    rotTasa: 'Tasa de deserción promedio acumulada'
  },
  {
    id: 'graduacionAcumulada',
    rotulo: 'Graduación acumulada',
    tipo: 'semestre',
    rotNum: 'Graduados acumulados',
    rotTasa: 'Tasa de graduación acumulada'
  },
  {
    id: 'ausenciaIntersemestral',
    rotulo: 'Ausencia intersemestral',
    tipo: 'periodo',
    numerador: 'cantidad',
    denominador: 'matriculados',
    rotNum: 'Ausentes',
    rotDen: 'Matriculados',
    rotTasa: 'Tasa de ausencia intersemestral'
  },
  {
    id: 'supervivencia',
    rotulo: 'Análisis de supervivencia',
    tipo: 'semestre',
    rotNum: 'Estudiantes que permanecen',
    rotTasa: 'Tasa de supervivencia'
  },
  {
    id: 'desercion28',
    rotulo: 'Deserción período 2.8',
    tipo: 'periodo',
    numerador: 'cantidad',
    denominador: 'matriculados',
    rotNum: 'Desertores',
    rotDen: 'Matriculados no graduados',
    rotTasa: 'Tasa de deserción período 2.8'
  }
];

const ORDEN_ENTIDADES = ['1101', '1102', '1103', '1104', '9933', 'UNAL', 'NACIONAL'];
const ENFOQUES = ['sistema', 'ies', 'programa'];

const enfoquesDisponibles = pest => Object.keys(D[pest.id].enfoques);

/** Categorías del eje: períodos, semestres o cohortes según el indicador. */
const ejesDe = (pest, filtros) => {
  const datos = D[pest.id];
  if (pest.tipo === 'cohorte') {
    const bloque = (datos.enfoques[filtros.enfoque] || {})[filtros.entidadCohorte];
    return bloque ? bloque.cohortes : [];
  }
  return pest.tipo === 'semestre' ? datos.semestres : datos.periodos;
};

const entidadesDisponibles = (pest, enfoque) => {
  const ent = D[pest.id].enfoques[enfoque] || {};
  const propias = ORDEN_ENTIDADES.filter(k => ent[k]);
  return propias.length ? propias : Object.keys(ent);
};

/* ==================================================================== */
/*  Piezas de interfaz                                                   */
/* ==================================================================== */

/** Ícono de información con globo de definición (accesible por teclado). */
function Info({ id, titulo, texto }) {
  const [fijo, setFijo] = useState(false);
  return (
    <button
      type="button"
      className="dsh-info"
      aria-describedby={id}
      aria-label={'Cómo se lee ' + titulo}
      onClick={() => setFijo(f => !f)}
      onBlur={() => setFijo(false)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 7h2v2h-2V7Zm0 4h2v6h-2v-6Zm1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
      </svg>
      <span id={id} role="tooltip" className={'dsh-globo' + (fijo ? ' visible' : '')}>
        <b>Cómo se lee</b>
        {texto}
      </span>
    </button>
  );
}

/** Control segmentado: sustituye a los radios y a los selectores cortos. */
function Segmento({ etiqueta, opciones, valor, onCambio, compacto }) {
  return (
    <div className={'dsh-segmento' + (compacto ? ' compacto' : '')}
      role="group" aria-label={etiqueta}>
      {opciones.map(o => (
        <button
          key={o.valor}
          type="button"
          disabled={o.inhabilitado}
          aria-pressed={valor === o.valor}
          onClick={() => onCambio(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

/** Tarjeta con encabezado de altura fija para que los recuadros se alineen. */
function Tarjeta({ titulo, info, accion, children }) {
  return (
    <section className="dsh-card">
      <div className="dsh-card-h">
        <h2>
          {titulo}
          {info ? <Info id={'i-' + clave(titulo)} titulo={titulo} texto={info} /> : null}
        </h2>
        {accion || null}
      </div>
      <div className="dsh-cuerpo">{children}</div>
    </section>
  );
}

/** Tarjeta que contiene un gráfico y sus botones de descarga. */
function TarjetaGrafico({ titulo, info, alto, opcion, csv, archivo }) {
  const instancia = useRef(null);
  return (
    <Tarjeta titulo={titulo} info={info}
      accion={<Descargas csv={csv} instancia={instancia} nombre={archivo}
        titulo={titulo} />}>
      {opcion
        ? <Grafico opcion={opcion} alto={alto} instancia={instancia} />
        : <p className="dsh-vacio">Sin datos para la combinación seleccionada.</p>}
    </Tarjeta>
  );
}

/** Selector de varias categorías (períodos, semestres o cohortes). */
function SelectorMultiple({ etiqueta, opciones, valores, onCambio, etiquetar,
  vacio: sinOpciones, deshabilitado }) {
  const texto = o => (etiquetar ? etiquetar(o) : o);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = e => {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false);
    };
    const esc = e => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [abierto]);

  const todos = opciones.length > 0 && valores.length === opciones.length;
  const resumen = !opciones.length
    ? (sinOpciones || 'Sin opciones')
    : todos
      ? 'Todos (' + opciones.length + ')'
      : valores.length === 0
        ? (sinOpciones || 'Ninguno seleccionado')
        : valores.length === 1
          ? texto(valores[0])
          : valores.length + ' seleccionados';

  const alternar = v => {
    const s = valores.slice();
    const i = s.indexOf(v);
    if (i >= 0) s.splice(i, 1); else s.push(v);
    onCambio(opciones.filter(o => s.indexOf(o) >= 0));
  };

  return (
    <div className="dsh-multi" ref={caja}>
      <button type="button" aria-haspopup="true" aria-expanded={abierto}
        disabled={deshabilitado || !opciones.length}
        onClick={() => setAbierto(a => !a)}>
        {resumen}
      </button>
      {abierto ? (
        <div className="dsh-multi-panel" role="group" aria-label={etiqueta}>
          <div className="dsh-multi-acc">
            <button type="button" onClick={() => onCambio(opciones.slice())}>Todos</button>
            <button type="button" onClick={() => onCambio([])}>Ninguno</button>
          </div>
          <div className="dsh-multi-lista">
            {opciones.map(o => (
              <label key={o}>
                <input type="checkbox" checked={valores.indexOf(o) >= 0}
                  onChange={() => alternar(o)} />
                {texto(o)}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Envoltorio de ECharts. */
function Grafico({ opcion, alto, instancia }) {
  const caja = useRef(null);
  const inst = useRef(null);

  useEffect(() => {
    if (!window.echarts || !caja.current) return undefined;
    inst.current = window.echarts.init(caja.current, null, { renderer: 'canvas' });
    if (instancia) instancia.current = inst.current;
    const redimensionar = () => inst.current && inst.current.resize();
    let obs = null;
    if (window.ResizeObserver) {
      obs = new ResizeObserver(redimensionar);
      obs.observe(caja.current);
    }
    window.addEventListener('resize', redimensionar);
    return () => {
      window.removeEventListener('resize', redimensionar);
      if (obs) obs.disconnect();
      if (inst.current) inst.current.dispose();
      inst.current = null;
      if (instancia) instancia.current = null;
    };
  }, []);

  useEffect(() => {
    if (inst.current && opcion) inst.current.setOption(opcion, true);
  }, [opcion]);

  if (!window.echarts) {
    return <p className="dsh-vacio">Los gráficos no están disponibles en esta sesión.</p>;
  }
  return <div ref={caja} className={'dsh-grafico ' + (alto || '')} />;
}

/**
 * Tabla en formato ancho: una fila por período o semestre y una columna por
 * serie. Resulta mucho más compacta que el formato largo y permite comparar
 * las sedes de un vistazo.
 */
function TablaPivote({ rotEje, ejes, claves, matriz, formato, altura }) {
  const [asc, setAsc] = useState(true);
  const orden = useMemo(() => {
    const i = ejes.map((e, k) => k);
    return asc ? i : i.slice().reverse();
  }, [ejes, asc]);

  if (!claves.length) {
    return <p className="dsh-vacio">Seleccione al menos una serie.</p>;
  }

  return (
    <div className="dsh-tabla-wrap" style={altura ? { maxHeight: altura } : null}>
      <table className="dsh-tabla">
        <thead>
          <tr>
            <th className="fija" onClick={() => setAsc(a => !a)}>
              {rotEje} <span className="ord">{asc ? '▲' : '▼'}</span>
            </th>
            {claves.map(k => (
              <th key={k} className="num">
                <span className="dsh-punto-l" style={{ background: color(k) }} />
                {rotulo(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orden.map(i => (
            <tr key={ejes[i]}>
              <td className="fija">{ejes[i]}</td>
              {claves.map(k => (
                <td key={k} className="num">{formato(matriz[k][i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Matriz numérica cohorte × semestre con primera columna fija. */
function Matriz({ cohortes, semestres, matriz, formato }) {
  if (!cohortes.length) {
    return <p className="dsh-vacio">Sin cohortes en el rango seleccionado.</p>;
  }
  return (
    <div className="dsh-tabla-wrap" style={{ maxHeight: 420 }}>
      <table className="dsh-tabla">
        <thead>
          <tr>
            <th className="fija">Cohorte</th>
            {semestres.map(s => <th key={s} className="num">{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohortes.map((c, i) => (
            <tr key={c}>
              <td className="fija">{c}</td>
              {semestres.map((s, j) => (
                <td key={s} className="num">{formato(matriz[i][j])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tarjeta de indicador clave. */
function Kpi({ icono, fondo, etiqueta, valor, pie }) {
  return (
    <div className="dsh-kpi">
      <span className="dsh-kpi-ic" style={{ background: fondo }}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={icono} />
        </svg>
      </span>
      <span>
        <span className="dsh-kpi-lab">{etiqueta}</span>
        <span className="dsh-kpi-val">{valor}</span>
        {pie ? <span className="dsh-kpi-pie">{pie}</span> : null}
      </span>
    </div>
  );
}

const IC = {
  doc: 'M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM8 12h8v1.6H8V12Zm0 3.4h8V17H8v-1.6Z',
  salida: 'M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5v-2H5V5h5V3Zm6.6 4L15.2 8.4 17.8 11H9v2h8.8l-2.6 2.6L16.6 17l5-5-5-5Z',
  tasa: 'M3.5 18.5 9 13l4 4 7.5-7.5-1.4-1.4L13 14.2l-4-4-6.9 6.9 1.4 1.4Z',
  reloj: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 10.6 4.2 2.5-.9 1.5L11 13.4V6h2v6.6Z',
  variacion: 'M12 4 4 12h5v8h6v-8h5L12 4Z',
  cinta: 'm12 17.3-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2l2.9 6.6 7.1.6-5.4 4.8 1.6 7z',
  malla: 'M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z'
};

/* ==================================================================== */
/*  Configuración base de los gráficos                                   */
/* ==================================================================== */

const TIPO_LETRA = 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const baseOpcion = () => ({
  textStyle: { fontFamily: TIPO_LETRA, fontSize: 11, color: '#4e5254' },
  animationDuration: 300,
  grid: { left: 62, right: 26, top: 42, bottom: 64, containLabel: false },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#ffffff',
    borderColor: '#dcdcdc',
    borderWidth: 1,
    textStyle: { color: '#242627', fontSize: 11, fontFamily: TIPO_LETRA },
    axisPointer: { type: 'line', lineStyle: { color: '#a2a3a4', type: 'dashed' } }
  },
  legend: {
    top: 0,
    icon: 'roundRect',
    itemWidth: 11,
    itemHeight: 11,
    itemGap: 14,
    textStyle: { color: '#4e5254', fontSize: 11 }
  }
});

const ejeX = etiquetas => ({
  type: 'category',
  data: etiquetas,
  boundaryGap: true,
  axisLine: { lineStyle: { color: '#dcdcdc' } },
  axisTick: { show: false },
  axisLabel: { color: '#4e5254', rotate: 90, fontSize: 9, interval: 0 }
});

const ejeY = esPct => ({
  type: 'value',
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: '#f0f0f0' } },
  axisLabel: {
    color: '#4e5254',
    fontSize: 10,
    formatter: v => (esPct ? v + ' %' : fEnt.format(v))
  }
});

function opcionLineas(etiquetas, series, esPct) {
  const o = baseOpcion();
  o.xAxis = ejeX(etiquetas);
  o.yAxis = ejeY(esPct);
  if (series.length > 6) o.legend.type = 'scroll';
  o.tooltip.valueFormatter = v => (vacio(v) ? '—' : esPct ? pct(v) : num(v));
  o.series = series.map(s => ({
    name: s.nombre,
    type: 'line',
    data: s.datos,
    connectNulls: false,
    smooth: 0.35,
    smoothMonotone: 'x',
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: true,
    lineStyle: {
      width: s.clave === 'UNAL' ? 2.8 : 2,
      type: s.clave === 'NACIONAL' ? 'dashed' : trazoDe(s.clave),
      color: s.color,
      cap: 'round',
      join: 'round'
    },
    itemStyle: { color: s.color, borderColor: '#fff', borderWidth: 1.4 },
    emphasis: { focus: 'series', scale: 1.4 },
    // La sombra bajo la línea se retira con más de dos series, porque al
    // superponerse ensucia la lectura del gráfico.
    areaStyle: series.length <= 2 ? { color: s.color, opacity: 0.13 } : null
  }));
  return o;
}

function opcionBarras(etiquetas, series) {
  const o = baseOpcion();
  o.xAxis = ejeX(etiquetas);
  o.yAxis = ejeY(false);
  if (series.length > 6) o.legend.type = 'scroll';
  o.tooltip.valueFormatter = v => num(v);
  o.series = series.map(s => ({
    name: s.nombre,
    type: 'bar',
    data: s.datos,
    barMaxWidth: 18,
    itemStyle: { color: s.color, borderRadius: [4, 4, 1, 1] },
    emphasis: { focus: 'series' }
  }));
  return o;
}

function opcionMapaCalor(cohortes, semestres, celdas, esPct, maximo) {
  // Con pocas columnas cabe el número dentro de la celda.
  const etiquetaVisible = semestres.length <= 22 && cohortes.length <= 34;
  return {
    textStyle: { fontFamily: TIPO_LETRA, fontSize: 11, color: '#4e5254' },
    animation: false,
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: '#dcdcdc',
      borderWidth: 1,
      textStyle: { color: '#242627', fontSize: 11, fontFamily: TIPO_LETRA },
      formatter: p =>
        'Cohorte ' + cohortes[p.value[1]] + ' · semestre ' +
        semestres[p.value[0]].replace('S', '') + '<br/>' +
        (esPct ? pct(p.value[2]) : num(p.value[2]))
    },
    grid: { left: 68, right: 26, top: 34, bottom: 16 },
    xAxis: {
      type: 'category',
      position: 'top',
      data: semestres,
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#4e5254', fontSize: 10, interval: 0 }
    },
    yAxis: {
      type: 'category',
      data: cohortes,
      inverse: true,          // la cohorte más antigua arriba y el eje crece hacia abajo
      splitArea: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#4e5254', fontSize: 10 }
    },
    visualMap: {
      show: false,          // la escala se lee en el número de cada celda
      min: 0,
      max: maximo,
      type: 'continuous',
      inRange: {
        color: ['#f4fddd', '#d7e6a8', '#b0cc6a', '#87a436', '#677d29', '#4a5c1d']
      }
    },
    series: [{
      type: 'heatmap',
      // El número se pinta claro sobre los tonos oscuros de la escala y oscuro
      // sobre los claros, para conservar el contraste en toda la matriz.
      data: celdas.map(c => ({
        value: c,
        label: { color: c[2] > maximo * 0.55 ? '#ffffff' : '#2c3416' }
      })),
      progressive: 2000,
      label: {
        show: etiquetaVisible,
        fontSize: 9,
        fontWeight: 500,
        formatter: p => (esPct ? p.value[2].toFixed(0) : fEnt.format(p.value[2]))
      },
      itemStyle: { borderColor: '#ffffff', borderWidth: 1.5, borderRadius: 3 },
      emphasis: { itemStyle: { borderColor: '#242627', borderWidth: 1.5 } }
    }]
  };
}

/* ==================================================================== */
/*  Bloque de definición (única en el tablero, en la parte superior)      */
/* ==================================================================== */

function Definicion({ def }) {
  return (
    <div className="dsh-definicion">
      <h1>
        {def.titulo}
        <Info id={'def-' + clave(def.titulo)} titulo={def.titulo} texto={def.nota} />
      </h1>
      <p>{def.texto}</p>
    </div>
  );
}

/** Nota discreta bajo los filtros con el alcance del tipo de cálculo activo. */
function NotaEnfoque({ def, enfoque, activos }) {
  const disponible = activos.indexOf(enfoque) >= 0;
  return (
    <p className="dsh-enfoque-nota">
      <b>{DEF.enfoques[enfoque].nombre}.</b>{' '}
      {disponible
        ? def.enfoques[enfoque]
        : 'Este tipo de cálculo no está disponible para el indicador en las bases entregadas.'}
    </p>
  );
}

/* ==================================================================== */
/*  Panel: indicadores por período                                       */
/* ==================================================================== */

function PanelPeriodo({ pest, filtros }) {
  const datos = D[pest.id];
  const def = DEF.indicadores[pest.id];
  const ent = datos.enfoques[filtros.enfoque] || {};
  const claves = filtros.entidades.filter(k => ent[k]);
  const idx = datos.periodos
    .map((p, i) => i)
    .filter(i => filtros.ejes.indexOf(datos.periodos[i]) >= 0);
  const periodos = idx.map(i => datos.periodos[i]);
  const firma = claves.join('|') + '@' + filtros.enfoque + '#' + periodos.join(',');

  const armar = campo =>
    claves.map(k => ({
      clave: k, nombre: rotulo(k), color: color(k),
      datos: idx.map(i => (ent[k][campo] || [])[i])
    }));

  const sDen = useMemo(() => armar(pest.denominador), [pest.id, firma]);
  const sNum = useMemo(() => armar(pest.numerador), [pest.id, firma]);
  const sTasa = useMemo(() => armar('tasa'), [pest.id, firma]);

  const oTasa = useMemo(() => opcionLineas(periodos, sTasa, true), [sTasa]);
  const oDen = useMemo(() => opcionLineas(periodos, sDen, false), [sDen]);
  const oNum = useMemo(() => opcionBarras(periodos, sNum), [sNum]);

  /* Cada tarjeta usa el último período con dato de su propia serie: los
     denominadores y numeradores no siempre se publican hasta el mismo corte. */
  const ref = claves[0];
  const kpis = useMemo(() => {
    if (!ref) return null;
    const corte = campo => {
      const serie = idx.map(i => (ent[ref][campo] || [])[i]);
      const i = ultimo(serie);
      return i < 0 ? { valor: null, periodo: '—' } : { valor: serie[i], periodo: periodos[i] };
    };
    const t = idx.map(i => ent[ref].tasa[i]);
    const it = ultimo(t);
    const previo = it >= 2 ? t[it - 2] : null;
    return {
      entidad: ref,
      tasa: corte('tasa'),
      den: corte(pest.denominador),
      numer: corte(pest.numerador),
      delta: it < 0 || vacio(previo) ? null : t[it] - previo,
      periodoTasa: it < 0 ? '—' : periodos[it],
      comparacion: it < 2 ? '—' : periodos[it - 2] + ' → ' + periodos[it]
    };
  }, [pest.id, firma]);

  const [medida, setMedida] = useState('tasa');
  const campoMedida =
    medida === 'tasa' ? 'tasa' : medida === 'num' ? pest.numerador : pest.denominador;
  const matriz = {};
  claves.forEach(k => { matriz[k] = idx.map(i => (ent[k][campoMedida] || [])[i]); });

  /* Cada descarga entrega exactamente lo que está en pantalla: las sedes
     seleccionadas, el rango de períodos marcado y la medida correspondiente. */
  const csvDe = campo => () => ({
    encabezados: ['Período'].concat(claves.map(k => nombre(k))),
    filas: periodos.map((p, j) => [p].concat(claves.map(k => (ent[k][campo] || [])[idx[j]])))
  });
  const base = [pest.id, filtros.enfoque];

  return (
    <React.Fragment>
      {kpis ? (
        <section className="dsh-kpis" aria-label="Indicadores">
          <Kpi icono={IC.tasa} fondo="var(--dsh-primary)" etiqueta={pest.rotTasa}
            valor={pct(kpis.tasa.valor)}
            pie={nombre(kpis.entidad) + ' · ' + kpis.tasa.periodo} />
          <Kpi icono={IC.doc} fondo="var(--dsh-azul)" etiqueta={pest.rotDen}
            valor={num(kpis.den.valor)}
            pie={nombre(kpis.entidad) + ' · ' + kpis.den.periodo} />
          <Kpi icono={IC.salida} fondo="var(--dsh-reprobada)" etiqueta={pest.rotNum}
            valor={num(kpis.numer.valor)}
            pie={nombre(kpis.entidad) + ' · ' + kpis.numer.periodo} />
          <Kpi icono={IC.variacion} fondo="var(--dsh-aprobada)" etiqueta="Variación anual"
            valor={pp(kpis.delta)} pie={kpis.comparacion} />
          <Kpi icono={IC.reloj} fondo="var(--dsh-cancelada)" etiqueta="Período de corte"
            valor={kpis.periodoTasa}
            pie={periodos.length
              ? periodos[0] + ' a ' + periodos[periodos.length - 1]
              : 'Sin períodos'} />
        </section>
      ) : null}

      <div className="dsh-mosaico dsh-mosaico-1">
        <TarjetaGrafico titulo={pest.rotTasa} info={def.graficos.tasa} alto="hero"
          opcion={oTasa} csv={csvDe('tasa')}
          archivo={nombreArchivo(base.concat(['tasa']))} />
      </div>

      <div className="dsh-mosaico dsh-mosaico-2">
        <TarjetaGrafico titulo={pest.rotDen} info={def.graficos.den}
          opcion={oDen} csv={csvDe(pest.denominador)}
          archivo={nombreArchivo(base.concat([pest.rotDen]))} />
        <TarjetaGrafico titulo={pest.rotNum} info={def.graficos.num}
          opcion={oNum} csv={csvDe(pest.numerador)}
          archivo={nombreArchivo(base.concat([pest.rotNum]))} />
      </div>

      <div className="dsh-mosaico dsh-mosaico-1">
        <Tarjeta
          titulo={'Detalle por período'}
          info={def.nota}
          accion={
            <span className="dsh-acc">
              <Segmento compacto etiqueta="Medida de la tabla" valor={medida}
                onCambio={setMedida}
                opciones={[
                  { valor: 'tasa', texto: 'Tasa' },
                  { valor: 'num', texto: pest.rotNum },
                  { valor: 'den', texto: pest.rotDen }
                ]} />
              <Descargas csv={csvDe(campoMedida)}
                nombre={nombreArchivo(base.concat(['detalle', medida]))} />
            </span>
          }>
          <TablaPivote rotEje="Período" ejes={periodos} claves={claves} matriz={matriz}
            formato={medida === 'tasa' ? v => pct(v) : v => num(v)} />
        </Tarjeta>
      </div>
    </React.Fragment>
  );
}

/* ==================================================================== */
/*  Panel: indicadores acumulados por semestre                           */
/* ==================================================================== */

function PanelSemestre({ pest, filtros }) {
  const datos = D[pest.id];
  const def = DEF.indicadores[pest.id];
  const ent = datos.enfoques[filtros.enfoque] || {};
  const claves = filtros.entidades.filter(k => ent[k]);
  const idx = datos.semestres
    .map((x, i) => i)
    .filter(i => filtros.ejes.indexOf(datos.semestres[i]) >= 0);
  const sems = idx.map(i => datos.semestres[i]);
  const firma = claves.join('|') + '@' + filtros.enfoque + '#' + sems.join(',');

  // La graduación se lee sobre la duración teórica de los programas.
  const hito = pest.id === 'graduacionAcumulada' ? 'S13' : 'S10';
  const rotHito = pest.id === 'graduacionAcumulada'
    ? 'Al treceavo semestre' : 'Al décimo semestre';

  const armar = campo =>
    claves.map(k => ({
      clave: k, nombre: rotulo(k), color: color(k),
      datos: idx.map(i => (ent[k][campo] || [])[i])
    }));

  const sTasa = useMemo(() => armar('tasa'), [pest.id, firma]);
  const sCant = useMemo(() => armar('cantidad'), [pest.id, firma]);

  const oTasa = useMemo(() => opcionLineas(sems, sTasa, true), [sTasa]);
  const oCant = useMemo(() => opcionLineas(sems, sCant, false), [sCant]);

  const ref = claves[0];
  const kpis = useMemo(() => {
    if (!ref) return null;
    const todos = datos.semestres;
    const en = (campo, sem) => {
      const j = todos.indexOf(sem);
      return j < 0 ? null : (ent[ref][campo] || [])[j];
    };
    const iu = ultimo(ent[ref].tasa);
    return {
      entidad: ref,
      s2: en('tasa', 'S2'),
      hito: en('tasa', hito),
      s20: en('tasa', 'S20'),
      cantHito: en('cantidad', hito),
      ultimoSem: iu < 0 ? '—' : todos[iu],
      tasaUltimo: iu < 0 ? null : ent[ref].tasa[iu]
    };
  }, [pest.id, firma]);

  const [medida, setMedida] = useState('tasa');
  const matriz = {};
  claves.forEach(k => {
    matriz[k] = idx.map(i => (ent[k][medida === 'tasa' ? 'tasa' : 'cantidad'] || [])[i]);
  });

  const csvDe = campo => () => ({
    encabezados: ['Semestre'].concat(claves.map(k => nombre(k))),
    filas: sems.map((x, j) => [x].concat(claves.map(k => (ent[k][campo] || [])[idx[j]])))
  });
  const base = [pest.id, filtros.enfoque];

  return (
    <React.Fragment>
      {kpis ? (
        <section className="dsh-kpis" aria-label="Indicadores">
          <Kpi icono={IC.tasa} fondo="var(--dsh-azul)" etiqueta="Al segundo semestre"
            valor={pct(kpis.s2)} pie={nombre(kpis.entidad) + ' · S2'} />
          <Kpi icono={IC.tasa} fondo="var(--dsh-primary)" etiqueta={rotHito}
            valor={pct(kpis.hito)} pie={nombre(kpis.entidad) + ' · ' + hito} />
          <Kpi icono={IC.tasa} fondo="var(--dsh-verde)" etiqueta="Al vigésimo semestre"
            valor={pct(kpis.s20)} pie={nombre(kpis.entidad) + ' · S20'} />
          <Kpi icono={IC.cinta} fondo="var(--dsh-aprobada)" etiqueta={pest.rotNum}
            valor={num(kpis.cantHito)}
            pie={nombre(kpis.entidad) + ' · acumulado a ' + hito} />
          <Kpi icono={IC.reloj} fondo="var(--dsh-cancelada)" etiqueta="Último semestre observado"
            valor={kpis.ultimoSem} pie={pct(kpis.tasaUltimo)} />
        </section>
      ) : null}

      <div className="dsh-mosaico dsh-mosaico-1">
        <TarjetaGrafico titulo={pest.rotTasa} info={def.graficos.tasa} alto="hero"
          opcion={oTasa} csv={csvDe('tasa')}
          archivo={nombreArchivo(base.concat(['tasa']))} />
      </div>

      <div className="dsh-mosaico dsh-mosaico-1">
        <TarjetaGrafico titulo={pest.rotNum} info={def.graficos.cantidad}
          opcion={oCant} csv={csvDe('cantidad')}
          archivo={nombreArchivo(base.concat([pest.rotNum]))} />
      </div>

      <div className="dsh-mosaico dsh-mosaico-1">
        <Tarjeta titulo="Detalle por semestre" info={def.nota}
          accion={
            <span className="dsh-acc">
              <Segmento compacto etiqueta="Medida de la tabla" valor={medida}
                onCambio={setMedida}
                opciones={[
                  { valor: 'tasa', texto: 'Tasa' },
                  { valor: 'cantidad', texto: pest.rotNum }
                ]} />
              <Descargas csv={csvDe(medida === 'tasa' ? 'tasa' : 'cantidad')}
                nombre={nombreArchivo(base.concat(['detalle', medida]))} />
            </span>
          }>
          <TablaPivote rotEje="Semestre" ejes={sems} claves={claves} matriz={matriz}
            formato={medida === 'tasa' ? v => pct(v) : v => num(v)} />
        </Tarjeta>
      </div>
    </React.Fragment>
  );
}

/* ==================================================================== */
/*  Panel: deserción por cohorte                                         */
/* ==================================================================== */

function PanelCohorte({ pest, filtros }) {
  const datos = D.desercionCohorte;
  const def = DEF.indicadores.desercionCohorte;
  const disponibles = Object.keys(datos.enfoques[filtros.enfoque] || {});
  const entidad = disponibles.indexOf(filtros.entidadCohorte) >= 0
    ? filtros.entidadCohorte : disponibles[0];
  const bloque = (datos.enfoques[filtros.enfoque] || {})[entidad];
  const esPct = filtros.metrica === 'porcentaje';

  const vista = useMemo(() => {
    if (!bloque) return null;
    const fila = bloque.cohortes
      .map((c, i) => i)
      .filter(i => filtros.ejes.indexOf(bloque.cohortes[i]) >= 0);
    const cohortes = fila.map(i => bloque.cohortes[i]);
    const completa = fila.map(i => (esPct ? bloque.porcentaje : bloque.cantidad)[i]);
    let ultima = 0;
    completa.forEach(f => f.forEach((v, j) => { if (!vacio(v) && j > ultima) ultima = j; }));
    const semestres = bloque.semestres.slice(0, ultima + 1);
    const matriz = completa.map(f => f.slice(0, ultima + 1));
    const celdas = [];
    let maximo = 0;
    matriz.forEach((f, i) => f.forEach((v, j) => {
      if (!vacio(v)) { celdas.push([j, i, v]); if (v > maximo) maximo = v; }
    }));
    return { cohortes, semestres, matriz, celdas, maximo };
  }, [bloque, esPct, filtros.ejes.join(',')]);

  const opcion = useMemo(
    () => (vista && vista.cohortes.length
      ? opcionMapaCalor(vista.cohortes, vista.semestres, vista.celdas, esPct,
        vista.maximo || 1)
      : null),
    [vista, esPct]
  );

  const kpis = useMemo(() => {
    if (!vista || !vista.cohortes.length) return null;
    const col = j => vista.matriz.map(f => f[j]).filter(v => !vacio(v));
    const prom = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    return {
      cohortes: vista.cohortes.length,
      semestres: vista.semestres.length,
      s2: prom(col(1)),
      s10: prom(col(9)),
      maximo: vista.maximo
    };
  }, [vista]);

  const fmt = v => (esPct ? pct(v, 1) : num(v));
  const titulo = esPct
    ? 'Tasa de deserción por cohorte'
    : 'Desertores acumulados por cohorte';

  const csvMatriz = () => {
    if (!vista) return null;
    return {
      encabezados: ['Cohorte'].concat(vista.semestres),
      filas: vista.cohortes.map((c, i) => [c].concat(vista.matriz[i]))
    };
  };
  const archivo = nombreArchivo(
    ['desercion-cohorte', filtros.enfoque, nombre(entidad), filtros.metrica]);

  return (
    <React.Fragment>
      {kpis ? (
        <section className="dsh-kpis" aria-label="Indicadores">
          <Kpi icono={IC.malla} fondo="var(--dsh-azul)" etiqueta="Cohortes graficadas"
            valor={fEnt.format(kpis.cohortes)}
            pie={vista.cohortes[0] + ' a ' + vista.cohortes[kpis.cohortes - 1]} />
          <Kpi icono={IC.reloj} fondo="var(--dsh-azul-claro)" etiqueta="Semestres observados"
            valor={fEnt.format(kpis.semestres)} pie={nombre(entidad)} />
          <Kpi icono={IC.tasa} fondo="var(--dsh-primary)" etiqueta="Promedio al segundo semestre"
            valor={esPct ? pct(kpis.s2) : num(kpis.s2)} pie={nombre(entidad) + ' · S2'} />
          <Kpi icono={IC.tasa} fondo="var(--dsh-verde)" etiqueta="Promedio al décimo semestre"
            valor={esPct ? pct(kpis.s10) : num(kpis.s10)} pie={nombre(entidad) + ' · S10'} />
          <Kpi icono={IC.salida} fondo="var(--dsh-reprobada)" etiqueta="Valor máximo de la matriz"
            valor={esPct ? pct(kpis.maximo) : num(kpis.maximo)} pie={nombre(entidad)} />
        </section>
      ) : null}

      <div className="dsh-mosaico dsh-mosaico-1">
        <TarjetaGrafico titulo={titulo + ' · ' + nombre(entidad)} info={def.graficos.matriz}
          alto="alto" opcion={opcion} csv={csvMatriz} archivo={archivo} />
      </div>

      <div className="dsh-mosaico dsh-mosaico-1">
        <Tarjeta titulo={titulo} info={def.nota}
          accion={<Descargas csv={csvMatriz} nombre={archivo + '_matriz'} />}>
          {vista
            ? <Matriz cohortes={vista.cohortes} semestres={vista.semestres}
                matriz={vista.matriz} formato={fmt} />
            : <p className="dsh-vacio">Sin datos para la combinación seleccionada.</p>}
        </Tarjeta>
      </div>
    </React.Fragment>
  );
}

/* ==================================================================== */
/*  Sección de facultad y programa                                       */
/* ==================================================================== */

/* Basta con marcar facultades: sin programas se dibuja una serie por facultad.
   Con programas se dibuja una serie por programa y las facultades quedan como
   referencia solo si se pide. */
const haySeleccion = f => !!(f.facultades.length || f.programas.length);

/** Texto del tipo de serie que se está mostrando. */
const rotuloSeleccion = f =>
  !f.programas.length ? 'facultad' : f.verFacultades ? 'facultad y programa' : 'programa';

/** La sección solo se ofrece con el tipo de cálculo de programa. */
const seccionVisible = (pest, filtros) =>
  filtros.enfoque === 'programa' && !!datosProg(pest);

/** Encabezado que separa la consulta por facultad y programa del resto. */
function Encabezado({ titulo }) {
  return (
    <div className="dsh-seccion">
      <h2>{titulo}</h2>
    </div>
  );
}

/** Estado inicial de la sección: en blanco mientras falte una selección. */
function EnBlanco({ filtros }) {
  return (
    <div className="dsh-mosaico dsh-mosaico-1">
      <Tarjeta titulo="Facultad y programa">
        <p className="dsh-vacio">
          Seleccione una o varias facultades para ver una serie por facultad. Si
          además elige programas, se muestran las series de esos programas.
        </p>
      </Tarjeta>
    </div>
  );
}

/** Bloques de datos de las facultades y los programas elegidos, en ese orden. */
function seleccionados(mod, filtros) {
  if (!mod || !haySeleccion(filtros)) return [];
  const salida = [];
  const conFacultades = !filtros.programas.length || filtros.verFacultades;
  if (conFacultades) {
    filtros.facultades.forEach(c => {
      if (mod.facultades[c]) salida.push({ clave: CLAVE_FAC + c, bloque: mod.facultades[c] });
    });
  }
  filtros.programas.forEach(c => {
    if (mod.programas[c]) salida.push({ clave: CLAVE_PRO + c, bloque: mod.programas[c] });
  });
  return salida;
}

/** Primer programa elegido, o primera facultad si no hay programas: alimentan
    las tarjetas. */
function referencias(mod, filtros) {
  if (!mod) return null;
  const cp = filtros.programas[0];
  if (!cp) {
    const cf0 = filtros.facultades[0];
    if (!cf0 || !mod.facultades[cf0]) return null;
    return {
      programa: null,
      facultad: mod.facultades[cf0],
      propia: mod.facultades[cf0],
      clavePro: null,
      claveFac: CLAVE_FAC + cf0
    };
  }
  if (!mod.programas[cp]) return null;
  // La comparación y el peso se calculan contra la facultad del programa,
  // esté o no marcada en el filtro.
  const cf = (CAT.catalogo[cp] || {}).facultad;
  return {
    programa: mod.programas[cp],
    facultad: mod.facultades[cf] || null,
    propia: mod.facultades[cf] || null,
    clavePro: CLAVE_PRO + cp,
    claveFac: CLAVE_FAC + cf
  };
}

/* ---------------------------------------------- sección por período */

function SeccionPeriodo({ pest, filtros }) {
  const def = DEF.indicadores[pest.id];
  const mod = datosProg(pest);
  const partes = seleccionados(mod, filtros);
  const ejes = mod.periodos.filter(p => filtros.ejes.indexOf(p) >= 0);
  const idx = ejes.map(p => mod.periodos.indexOf(p));
  const claves = partes.map(x => x.clave);
  const firma = claves.join('|') + '#' + ejes.join(',');

  const armar = campo =>
    partes.map(x => ({
      clave: x.clave, nombre: rotulo(x.clave), color: color(x.clave),
      datos: idx.map(i => (x.bloque[campo] || [])[i])
    }));

  const sTasa = useMemo(() => armar('tasa'), [pest.id, firma]);
  const sNum = useMemo(() => armar('cantidad'), [pest.id, firma]);
  const sDen = useMemo(() => armar('matriculados'), [pest.id, firma]);

  const oTasa = useMemo(() => opcionLineas(ejes, sTasa, true), [sTasa]);
  const oNum = useMemo(() => opcionBarras(ejes, sNum), [sNum]);
  const oDen = useMemo(() => opcionLineas(ejes, sDen, false), [sDen]);

  const kpis = useMemo(() => {
    const ref = referencias(mod, filtros);
    if (!ref) return null;
    const pro = ref.programa || ref.facultad;
    const serie = idx.map(i => pro.tasa[i]);
    const i = ultimo(serie);
    if (i < 0) return null;
    const j = idx[i];
    const mp = pro.matriculados[j];
    const mf = ref.propia ? ref.propia.matriculados[j] : null;
    return {
      soloFac: !ref.programa,
      periodo: ejes[i],
      clavePro: ref.clavePro,
      claveFac: ref.claveFac,
      tasaPro: pro.tasa[j],
      tasaFac: ref.facultad ? ref.facultad.tasa[j] : null,
      numPro: pro.cantidad[j],
      denPro: mp,
      parte: mf ? 100.0 * mp / mf : null
    };
  }, [pest.id, firma]);

  const [medida, setMedida] = useState('tasa');
  const campo = medida === 'tasa' ? 'tasa' : medida === 'num' ? 'cantidad' : 'matriculados';
  const matriz = {};
  partes.forEach(x => { matriz[x.clave] = idx.map(i => (x.bloque[campo] || [])[i]); });

  const csvDe = c => () => ({
    encabezados: ['Período'].concat(claves.map(k => nombre(k))),
    filas: ejes.map((p, j) => [p].concat(partes.map(x => (x.bloque[c] || [])[idx[j]])))
  });
  const base = [pest.id, 'facultad-programa'];

  if (!haySeleccion(filtros)) return <EnBlanco filtros={filtros} />;

  return (
    <React.Fragment>
      {kpis ? (
        <section className="dsh-kpis" aria-label="Indicadores de la selección">
          {kpis.soloFac ? (
            <React.Fragment>
              <Kpi icono={IC.tasa} fondo="var(--dsh-azul)" etiqueta={pest.rotTasa + ' · facultad'}
                valor={pct(kpis.tasaFac)} pie={nombre(kpis.claveFac) + ' · ' + kpis.periodo} />
              <Kpi icono={IC.salida} fondo="var(--dsh-cancelada)" etiqueta={pest.rotNum + ' de la facultad'}
                valor={num(kpis.numPro)} pie={nombre(kpis.claveFac) + ' · ' + kpis.periodo} />
              <Kpi icono={IC.doc} fondo="var(--dsh-verde)" etiqueta={pest.rotDen + ' de la facultad'}
                valor={num(kpis.denPro)} pie={nombre(kpis.claveFac) + ' · ' + kpis.periodo} />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Kpi icono={IC.tasa} fondo="var(--dsh-primary)" etiqueta={pest.rotTasa + ' · programa'}
                valor={pct(kpis.tasaPro)} pie={nombre(kpis.clavePro) + ' · ' + kpis.periodo} />
              <Kpi icono={IC.tasa} fondo="var(--dsh-azul)" etiqueta={pest.rotTasa + ' · facultad'}
                valor={pct(kpis.tasaFac)} pie={nombre(kpis.claveFac) + ' · ' + kpis.periodo} />
              <Kpi icono={IC.salida} fondo="var(--dsh-cancelada)" etiqueta={pest.rotNum + ' del programa'}
                valor={num(kpis.numPro)} pie={nombre(kpis.clavePro) + ' · ' + kpis.periodo} />
              <Kpi icono={IC.doc} fondo="var(--dsh-verde)" etiqueta={pest.rotDen + ' del programa'}
                valor={num(kpis.denPro)} pie={nombre(kpis.clavePro) + ' · ' + kpis.periodo} />
              <Kpi icono={IC.malla} fondo="var(--dsh-aprobada)" etiqueta="Peso en su facultad"
                valor={pct(kpis.parte)} pie={'Matrícula · ' + kpis.periodo} />
            </React.Fragment>
          )}
        </section>
      ) : null}

      <div className="dsh-mosaico dsh-mosaico-1">
        <TarjetaGrafico titulo={pest.rotTasa + ' · ' + rotuloSeleccion(filtros)}
          info={def.graficos.tasa} alto="hero" opcion={oTasa} csv={csvDe('tasa')}
          archivo={nombreArchivo(base.concat(['tasa']))} />
      </div>

      <div className="dsh-mosaico dsh-mosaico-2">
        <TarjetaGrafico titulo={pest.rotDen + ' · ' + rotuloSeleccion(filtros)}
          info={def.graficos.den} opcion={oDen} csv={csvDe('matriculados')}
          archivo={nombreArchivo(base.concat([pest.rotDen]))} />
        <TarjetaGrafico titulo={pest.rotNum + ' · ' + rotuloSeleccion(filtros)}
          info={def.graficos.num} opcion={oNum} csv={csvDe('cantidad')}
          archivo={nombreArchivo(base.concat([pest.rotNum]))} />
      </div>

      <div className="dsh-mosaico dsh-mosaico-1">
        <Tarjeta titulo={'Detalle por período · ' + rotuloSeleccion(filtros)} info={def.nota}
          accion={
            <span className="dsh-acc">
              <Segmento compacto etiqueta="Medida de la tabla" valor={medida}
                onCambio={setMedida}
                opciones={[
                  { valor: 'tasa', texto: 'Tasa' },
                  { valor: 'num', texto: pest.rotNum },
                  { valor: 'den', texto: pest.rotDen }
                ]} />
              <Descargas csv={csvDe(campo)}
                nombre={nombreArchivo(base.concat(['detalle', medida]))} />
            </span>
          }>
          <TablaPivote rotEje="Período" ejes={ejes} claves={claves} matriz={matriz}
            formato={medida === 'tasa' ? v => pct(v) : v => num(v)} />
        </Tarjeta>
      </div>
    </React.Fragment>
  );
}

/* -------------------------------------------- sección por semestre */

function SeccionSemestre({ pest, filtros }) {
  const def = DEF.indicadores[pest.id];
  const mod = datosProg(pest);
  const partes = seleccionados(mod, filtros);
  const ejes = mod.semestres.filter(s => filtros.ejes.indexOf(s) >= 0);
  const idx = ejes.map(s => mod.semestres.indexOf(s));
  const claves = partes.map(x => x.clave);
  const firma = claves.join('|') + '#' + ejes.join(',');

  const hito = pest.id === 'graduacionAcumulada' ? 'S13' : 'S10';
  const rotHito = pest.id === 'graduacionAcumulada'
    ? 'Al treceavo semestre' : 'Al décimo semestre';

  const armar = campo =>
    partes.map(x => ({
      clave: x.clave, nombre: rotulo(x.clave), color: color(x.clave),
      datos: idx.map(i => (x.bloque[campo] || [])[i])
    }));

  const sTasa = useMemo(() => armar('tasa'), [pest.id, firma]);
  const sCant = useMemo(() => armar('cantidad'), [pest.id, firma]);

  const oTasa = useMemo(() => opcionLineas(ejes, sTasa, true), [sTasa]);
  const oCant = useMemo(() => opcionLineas(ejes, sCant, false), [sCant]);

  const kpis = useMemo(() => {
    const ref = referencias(mod, filtros);
    const j = mod.semestres.indexOf(hito);
    if (!ref || j < 0) return null;
    const pro = ref.programa || ref.facultad;
    const bp = pro.base[j];
    const bf = ref.propia ? ref.propia.base[j] : null;
    return {
      soloFac: !ref.programa,
      clavePro: ref.clavePro,
      claveFac: ref.claveFac,
      tasaPro: pro.tasa[j],
      tasaFac: ref.facultad ? ref.facultad.tasa[j] : null,
      cantPro: pro.cantidad[j],
      basePro: bp,
      parte: bf ? 100.0 * bp / bf : null
    };
  }, [pest.id, firma]);

  const [medida, setMedida] = useState('tasa');
  const matriz = {};
  partes.forEach(x => {
    matriz[x.clave] = idx.map(i => (x.bloque[medida === 'tasa' ? 'tasa' : 'cantidad'] || [])[i]);
  });

  const csvDe = c => () => ({
    encabezados: ['Semestre'].concat(claves.map(k => nombre(k))),
    filas: ejes.map((s, j) => [s].concat(partes.map(x => (x.bloque[c] || [])[idx[j]])))
  });
  const base = [pest.id, 'facultad-programa'];

  if (!haySeleccion(filtros)) return <EnBlanco filtros={filtros} />;

  return (
    <React.Fragment>
      {kpis ? (
        <section className="dsh-kpis" aria-label="Indicadores de la selección">
          {kpis.soloFac ? (
            <React.Fragment>
              <Kpi icono={IC.tasa} fondo="var(--dsh-azul)" etiqueta={rotHito + ' · facultad'}
                valor={pct(kpis.tasaFac)} pie={nombre(kpis.claveFac) + ' · ' + hito} />
              <Kpi icono={IC.cinta} fondo="var(--dsh-cancelada)" etiqueta={pest.rotNum + ' de la facultad'}
                valor={num(kpis.cantPro)} pie={nombre(kpis.claveFac) + ' · acumulado a ' + hito} />
              <Kpi icono={IC.doc} fondo="var(--dsh-verde)" etiqueta="Primíparos observados"
                valor={num(kpis.basePro)} pie={nombre(kpis.claveFac) + ' · base a ' + hito} />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Kpi icono={IC.tasa} fondo="var(--dsh-primary)" etiqueta={rotHito + ' · programa'}
                valor={pct(kpis.tasaPro)} pie={nombre(kpis.clavePro) + ' · ' + hito} />
              <Kpi icono={IC.tasa} fondo="var(--dsh-azul)" etiqueta={rotHito + ' · facultad'}
                valor={pct(kpis.tasaFac)} pie={nombre(kpis.claveFac) + ' · ' + hito} />
              <Kpi icono={IC.cinta} fondo="var(--dsh-cancelada)" etiqueta={pest.rotNum + ' del programa'}
                valor={num(kpis.cantPro)} pie={nombre(kpis.clavePro) + ' · acumulado a ' + hito} />
              <Kpi icono={IC.doc} fondo="var(--dsh-verde)" etiqueta="Primíparos observados"
                valor={num(kpis.basePro)} pie={nombre(kpis.clavePro) + ' · base a ' + hito} />
              <Kpi icono={IC.malla} fondo="var(--dsh-aprobada)" etiqueta="Peso en su facultad"
                valor={pct(kpis.parte)} pie={'Primíparos · ' + hito} />
            </React.Fragment>
          )}
        </section>
      ) : null}

      <div className="dsh-mosaico dsh-mosaico-1">
        <TarjetaGrafico titulo={pest.rotTasa + ' · ' + rotuloSeleccion(filtros)}
          info={def.graficos.tasa} alto="hero" opcion={oTasa} csv={csvDe('tasa')}
          archivo={nombreArchivo(base.concat(['tasa']))} />
      </div>

      <div className="dsh-mosaico dsh-mosaico-1">
        <TarjetaGrafico titulo={pest.rotNum + ' · ' + rotuloSeleccion(filtros)}
          info={def.graficos.cantidad} opcion={oCant} csv={csvDe('cantidad')}
          archivo={nombreArchivo(base.concat([pest.rotNum]))} />
      </div>

      <div className="dsh-mosaico dsh-mosaico-1">
        <Tarjeta titulo={'Detalle por semestre · ' + rotuloSeleccion(filtros)} info={def.nota}
          accion={
            <span className="dsh-acc">
              <Segmento compacto etiqueta="Medida de la tabla" valor={medida}
                onCambio={setMedida}
                opciones={[
                  { valor: 'tasa', texto: 'Tasa' },
                  { valor: 'cantidad', texto: pest.rotNum }
                ]} />
              <Descargas csv={csvDe(medida === 'tasa' ? 'tasa' : 'cantidad')}
                nombre={nombreArchivo(base.concat(['detalle', medida]))} />
            </span>
          }>
          <TablaPivote rotEje="Semestre" ejes={ejes} claves={claves} matriz={matriz}
            formato={medida === 'tasa' ? v => pct(v) : v => num(v)} />
        </Tarjeta>
      </div>
    </React.Fragment>
  );
}

/* --------------------------------------------- sección por cohorte */

function SeccionCohorte({ pest, filtros }) {
  const def = DEF.indicadores.desercionCohorte;
  const mod = datosProg(pest);
  const partes = seleccionados(mod, filtros);
  const esPct = filtros.metrica === 'porcentaje';
  const claves = partes.map(x => x.clave);
  const firma = claves.join('|') + '#' + esPct;

  /* Las cohortes marcadas en el filtro superior también recortan estas matrices;
     si ninguna coincide se muestran todas las del programa. */
  const filas = useMemo(() => {
    const s = mod.cohortes
      .map((c, i) => i)
      .filter(i => filtros.ejes.indexOf(mod.cohortes[i]) >= 0);
    return s.length ? s : mod.cohortes.map((c, i) => i);
  }, [pest.id, filtros.ejes.join(',')]);

  const vistas = useMemo(() => partes.map(x => {
    const cohortes = filas.map(i => mod.cohortes[i]);
    const completa = filas.map(i => (esPct ? x.bloque.porcentaje : x.bloque.cantidad)[i]);
    let ultima = 0;
    completa.forEach(f => f.forEach((v, j) => { if (!vacio(v) && j > ultima) ultima = j; }));
    const semestres = mod.semestres.slice(0, ultima + 1);
    const matriz = completa.map(f => f.slice(0, ultima + 1));
    const celdas = [];
    let maximo = 0;
    matriz.forEach((f, i) => f.forEach((v, j) => {
      if (!vacio(v)) { celdas.push([j, i, v]); if (v > maximo) maximo = v; }
    }));
    return { clave: x.clave, cohortes, semestres, matriz, celdas, maximo };
  }), [pest.id, firma, filas]);

  const [cual, setCual] = useState('');
  const fmt = v => (esPct ? pct(v, 1) : num(v));
  const titulo = esPct
    ? 'Tasa de deserción por cohorte'
    : 'Desertores acumulados por cohorte';

  const csvDe = v => () => ({
    encabezados: ['Cohorte'].concat(v.semestres),
    filas: v.cohortes.map((c, i) => [c].concat(v.matriz[i]))
  });

  if (!haySeleccion(filtros)) return <EnBlanco filtros={filtros} />;

  /* La tabla muestra una matriz a la vez: la elegida o, por defecto, la del
     primer programa marcado. */
  const elegida = vistas.filter(v => v.clave === cual)[0];
  const tabla = elegida
    || vistas.filter(v => !esFacultad(v.clave))[0]
    || vistas[0];

  return (
    <React.Fragment>
      {vistas.map(v => (
        <div className="dsh-mosaico dsh-mosaico-1" key={v.clave}>
          <TarjetaGrafico titulo={titulo + ' · ' + nombre(v.clave)}
            info={def.graficos.matriz} alto="alto"
            opcion={v.cohortes.length
              ? opcionMapaCalor(v.cohortes, v.semestres, v.celdas, esPct, v.maximo || 1)
              : null}
            csv={csvDe(v)}
            archivo={nombreArchivo(['desercion-cohorte', nombre(v.clave), filtros.metrica])} />
        </div>
      ))}

      <div className="dsh-mosaico dsh-mosaico-1">
        <Tarjeta titulo={titulo + ' · detalle'} info={def.nota}
          accion={
            <span className="dsh-acc">
              <select className="dsh-select dsh-select-acc" aria-label="Matriz de la tabla"
                value={tabla.clave} onChange={e => setCual(e.target.value)}>
                {vistas.map(v => (
                  <option key={v.clave} value={v.clave}>{nombre(v.clave)}</option>
                ))}
              </select>
              <Descargas csv={csvDe(tabla)}
                nombre={nombreArchivo(['desercion-cohorte', nombre(tabla.clave),
                  filtros.metrica, 'matriz'])} />
            </span>
          }>
          <Matriz cohortes={tabla.cohortes} semestres={tabla.semestres}
            matriz={tabla.matriz} formato={fmt} />
        </Tarjeta>
      </div>
    </React.Fragment>
  );
}

/* ------------------------------------- programas con mayor deserción */

/** El botón solo se ofrece en los indicadores de deserción con datos por programa. */
const PESTANAS_RANKING = ['desercionAnual', 'desercionCohorte', 'desercionPromedioAcumulada'];
const admiteRanking = pest =>
  PESTANAS_RANKING.indexOf(pest.id) >= 0 && !!datosProg(pest);

const promedio = v => {
  const x = v.filter(a => !vacio(a));
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null;
};

/** Criterio del ranking, en palabras, según el tipo de indicador. */
const criterioRanking = pest =>
  pest.tipo === 'cohorte'
    ? 'Promedio de la deserción acumulada más reciente de las cohortes marcadas'
    : pest.tipo === 'semestre'
      ? 'Promedio de la tasa en los semestres marcados'
      : 'Promedio de la tasa en los períodos marcados';

/** Puntaje de deserción de un programa con los filtros vigentes. */
function puntajeDesercion(pest, mod, cod, filtros) {
  const b = mod.programas[cod];
  if (!b) return null;
  if (pest.tipo === 'cohorte') {
    const marcadas = mod.cohortes.map((c, i) => i)
      .filter(i => filtros.ejes.indexOf(mod.cohortes[i]) >= 0);
    const filas = marcadas.length ? marcadas : mod.cohortes.map((c, i) => i);
    return promedio(filas.map(i => {
      const f = b.porcentaje[i] || [];
      const j = ultimo(f);
      return j < 0 ? null : f[j];
    }));
  }
  const ejes = pest.tipo === 'semestre' ? mod.semestres : mod.periodos;
  return promedio(ejes.map((e, i) => (filtros.ejes.indexOf(e) >= 0 ? b.tasa[i] : null)));
}

/** Los N programas con mayor deserción entre las facultades marcadas (o entre
    todas si no hay ninguna marcada). */
function programasMayorDesercion(pest, filtros, n) {
  const mod = datosProg(pest);
  if (!mod) return [];
  const candidatos = filtros.facultades.length ? programasVisibles(filtros) : ORDEN_PRO;
  return candidatos
    .map(c => ({ codigo: c, puntaje: puntajeDesercion(pest, mod, c, filtros) }))
    .filter(x => !vacio(x.puntaje))
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, n)
    .map(x => x.codigo);
}

/** Sección completa: encabezado y contenido según el tipo de indicador. */
function SeccionProgramas({ pest, filtros }) {
  if (!seccionVisible(pest, filtros)) return null;
  const Cuerpo = pest.tipo === 'cohorte' ? SeccionCohorte
    : pest.tipo === 'semestre' ? SeccionSemestre : SeccionPeriodo;
  const enc = DEF.facultadPrograma || {};
  return (
    <React.Fragment>
      <Encabezado titulo={enc.titulo || 'Consulta por facultad y programa'} />
      <Cuerpo key={pest.id} pest={pest} filtros={filtros} />
    </React.Fragment>
  );
}

/* ==================================================================== */
/*  Barra de filtros                                                     */
/* ==================================================================== */

function Filtros({ pest, filtros, cambiar, limpiar }) {
  const enfoques = enfoquesDisponibles(pest);
  const esCohorte = pest.tipo === 'cohorte';
  const datos = D[pest.id];

  const entidades = esCohorte
    ? Object.keys(datos.enfoques[filtros.enfoque] || {})
    : entidadesDisponibles(pest, filtros.enfoque);

  const ejes = ejesDe(pest, filtros);
  const rotEje = esCohorte ? 'Cohorte'
    : pest.tipo === 'semestre' ? 'Semestre' : 'Período';

  return (
    <section className="dsh-filtros" aria-label="Filtros">
      <div className={'dsh-grid-f ' + (esCohorte ? 'f-4' : 'f-3')}>
        <div className="dsh-campo">
          <span className="dsh-leyenda">Tipo de cálculo</span>
          <Segmento etiqueta="Tipo de cálculo" valor={filtros.enfoque}
            onCambio={k => cambiar({ enfoque: k })}
            opciones={ENFOQUES.map(k => ({
              valor: k,
              texto: DEF.enfoques[k].nombre,
              inhabilitado: enfoques.indexOf(k) < 0
            }))} />
        </div>

        {esCohorte ? (
          <React.Fragment>
            <div className="dsh-campo">
              <label htmlFor="f-sede">Sede</label>
              <select id="f-sede" className="dsh-select" value={filtros.entidadCohorte}
                disabled={entidades.length < 2}
                onChange={e => cambiar({ entidadCohorte: e.target.value })}>
                {entidades.map(k => <option key={k} value={k}>{nombre(k)}</option>)}
              </select>
            </div>
            <div className="dsh-campo">
              <span className="dsh-leyenda">Medida</span>
              <Segmento etiqueta="Medida" valor={filtros.metrica}
                onCambio={m => cambiar({ metrica: m })}
                opciones={[
                  { valor: 'porcentaje', texto: 'Porcentaje' },
                  { valor: 'cantidad', texto: 'Cantidad' }
                ]} />
            </div>
          </React.Fragment>
        ) : (
          <div className="dsh-campo">
            <span className="dsh-leyenda" id="lbl-series">Sede</span>
            <div className="dsh-fichas" role="group" aria-labelledby="lbl-series">
              {entidades.map(k => {
                const activo = filtros.entidades.indexOf(k) >= 0;
                return (
                  <button key={k} type="button" className="dsh-ficha"
                    aria-pressed={activo} title={nombre(k)}
                    onClick={() => {
                      const t = filtros.entidades.slice();
                      const i = t.indexOf(k);
                      if (i >= 0) t.splice(i, 1); else t.push(k);
                      cambiar({ entidades: t });
                    }}>
                    <i style={{ background: color(k) }} />
                    {rotulo(k)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="dsh-campo">
          <span className="dsh-leyenda">{rotEje}</span>
          <SelectorMultiple etiqueta={rotEje} opciones={ejes} valores={filtros.ejes}
            onCambio={v => cambiar({ ejes: v })} />
        </div>
      </div>

      {seccionVisible(pest, filtros) ? (
        <div className="dsh-grid-f f-prog">
          <div className="dsh-campo">
            <span className="dsh-leyenda">Facultad</span>
            <SelectorMultiple etiqueta="Facultad"
              opciones={CAT.facultades.map(f => f.codigo)}
              valores={filtros.facultades}
              etiquetar={c => nombre(CLAVE_FAC + c)}
              vacio="Seleccione una o varias facultades"
              onCambio={v => cambiar({ facultades: v })} />
          </div>

          <div className="dsh-campo">
            <span className="dsh-leyenda">Programa</span>
            <SelectorMultiple etiqueta="Programa"
              opciones={programasVisibles(filtros)}
              valores={filtros.programas}
              etiquetar={c => nombre(CLAVE_PRO + c)}
              vacio={filtros.facultades.length
                ? 'Opcional: elija programas para compararlos'
                : 'Elija primero una facultad'}
              onCambio={v => cambiar({ programas: v })} />
          </div>

          <div className="dsh-campo">
            <span className="dsh-leyenda" id="lbl-aplicado">Selección aplicada</span>
            <div className="dsh-fichas" role="group" aria-labelledby="lbl-aplicado">
              {filtros.facultades.map(c => (
                <span className="dsh-ficha-fija" key={'f' + c}>
                  <i style={{ background: color(CLAVE_FAC + c) }} />
                  <span>{nombre(CLAVE_FAC + c)}</span>
                  <button type="button" aria-label={'Quitar ' + nombre(CLAVE_FAC + c)}
                    onClick={() => cambiar({
                      facultades: filtros.facultades.filter(x => x !== c)
                    })}>×</button>
                </span>
              ))}
              {filtros.programas.map(c => (
                <span className="dsh-ficha-fija" key={'p' + c}>
                  <i style={{ background: color(CLAVE_PRO + c) }} />
                  <span>{nombre(CLAVE_PRO + c)}</span>
                  <button type="button" aria-label={'Quitar ' + nombre(CLAVE_PRO + c)}
                    onClick={() => cambiar({
                      programas: filtros.programas.filter(x => x !== c)
                    })}>×</button>
                </span>
              ))}
              {!filtros.facultades.length && !filtros.programas.length ? (
                <span className="dsh-sin-ficha">Sin facultad ni programa</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="dsh-acciones">
        {seccionVisible(pest, filtros) && filtros.facultades.length && filtros.programas.length ? (
          <label className="dsh-check">
            <input type="checkbox" checked={!!filtros.verFacultades}
              onChange={e => cambiar({ verFacultades: e.target.checked })} />
            Mostrar también las facultades
          </label>
        ) : null}
        {seccionVisible(pest, filtros) && admiteRanking(pest) ? (
          <span className="dsh-top" title={criterioRanking(pest)}>
            <select className="dsh-select dsh-select-acc" aria-label="Cantidad de programas"
              value={filtros.topN}
              onChange={e => cambiar({ topN: Number(e.target.value) })}>
              {[3, 5, 10].map(n => <option key={n} value={n}>{n} programas</option>)}
            </select>
            <button className="dsh-btn" type="button"
              onClick={() => {
                const top = programasMayorDesercion(pest, filtros, filtros.topN);
                if (!top.length) return;
                const facs = filtros.facultades.length
                  ? filtros.facultades
                  : CAT.facultades.filter(f => top.some(c => f.programas.indexOf(c) >= 0))
                    .map(f => f.codigo);
                cambiar({ facultades: facs, programas: top, verFacultades: false });
              }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 17h4V9H3v8Zm7 0h4V4h-4v13Zm7 0h4v-5h-4v5Z" />
              </svg>
              Programas con mayor deserción
            </button>
          </span>
        ) : null}
        <button className="dsh-btn" type="button" onClick={limpiar}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z" />
          </svg>
          Restablecer
        </button>
      </div>
    </section>
  );
}

/* ==================================================================== */
/*  Aplicación                                                           */
/* ==================================================================== */

const SEDE_PROPIA = '1102';   // Medellín es la sede de referencia del tablero

const filtrosPorDefecto = pest => {
  const datos = D[pest.id];
  const enfoques = enfoquesDisponibles(pest);
  const enfoque = enfoques.indexOf('programa') >= 0 ? 'programa' : enfoques[0];
  const disponibles = Object.keys(datos.enfoques[enfoque] || {});
  const propias = entidadesDisponibles(pest, enfoque);
  const base = {
    enfoque,
    entidades: pest.tipo === 'cohorte'
      ? []
      : (propias.indexOf(SEDE_PROPIA) >= 0 ? [SEDE_PROPIA] : propias.slice(0, 1)),
    entidadCohorte: pest.tipo === 'cohorte'
      ? (disponibles.indexOf(SEDE_PROPIA) >= 0 ? SEDE_PROPIA : disponibles[0])
      : null,
    metrica: 'porcentaje',
    facultades: [],
    programas: [],
    verFacultades: false,
    topN: 5
  };
  base.ejes = ejesDe(pest, base).slice();
  return base;
};

function App() {
  const [tab, setTab] = useState(0);
  const pest = PESTANAS[tab];
  const [filtros, setFiltros] = useState(() => filtrosPorDefecto(PESTANAS[0]));
  const refsTab = useRef([]);

  /* Las facultades y los programas se conservan al cambiar de pestaña: la consulta
     suele seguir al mismo programa a lo largo de los indicadores. */
  const irA = i => {
    setTab(i);
    setFiltros(f => Object.assign(filtrosPorDefecto(PESTANAS[i]),
      { facultades: f.facultades, programas: f.programas,
        verFacultades: f.verFacultades, topN: f.topN }));
  };

  const cambiar = parcial => {
    setFiltros(f => {
      const n = Object.assign({}, f, parcial);
      if (parcial.enfoque) {
        const disp = pest.tipo === 'cohorte'
          ? Object.keys(D[pest.id].enfoques[parcial.enfoque] || {})
          : entidadesDisponibles(pest, parcial.enfoque);
        if (pest.tipo === 'cohorte') {
          n.entidadCohorte = disp.indexOf(f.entidadCohorte) >= 0
            ? f.entidadCohorte
            : (disp.indexOf(SEDE_PROPIA) >= 0 ? SEDE_PROPIA : disp[0]);
        } else {
          const conserva = f.entidades.filter(k => disp.indexOf(k) >= 0);
          n.entidades = conserva.length
            ? conserva
            : (disp.indexOf(SEDE_PROPIA) >= 0 ? [SEDE_PROPIA] : disp.slice(0, 1));
        }
      }
      // Al retirar una facultad se retiran también sus programas.
      if (parcial.facultades) {
        const vivos = programasVisibles(n);
        n.programas = n.programas.filter(c => vivos.indexOf(c) >= 0);
      }
      // Al cambiar de enfoque o de sede el eje puede tener otras categorías.
      if (parcial.enfoque || parcial.entidadCohorte) {
        const nuevos = ejesDe(pest, n);
        const conserva = n.ejes.filter(e => nuevos.indexOf(e) >= 0);
        n.ejes = conserva.length ? conserva : nuevos.slice();
      }
      return n;
    });
  };

  const teclas = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = (i + (e.key === 'ArrowRight' ? 1 : PESTANAS.length - 1)) % PESTANAS.length;
    irA(n);
    if (refsTab.current[n]) refsTab.current[n].focus();
  };

  useEffect(() => {
    const raiz = document.getElementById('root');
    if (raiz) raiz.dataset.montado = '1';
  }, []);

  const Panel = pest.tipo === 'cohorte' ? PanelCohorte
    : pest.tipo === 'semestre' ? PanelSemestre : PanelPeriodo;

  return (
    <React.Fragment>
      <div className="dsh-tabs" role="tablist" aria-label="Indicadores del tablero">
        {PESTANAS.map((p, i) => (
          <button key={p.id} ref={el => (refsTab.current[i] = el)}
            className="dsh-tab" role="tab" id={'tab-' + p.id}
            aria-controls={'panel-' + p.id} aria-selected={i === tab}
            onClick={() => irA(i)} onKeyDown={e => teclas(e, i)}>
            {p.rotulo}
          </button>
        ))}
      </div>

      <Definicion def={DEF.indicadores[pest.id]} />

      <Filtros pest={pest} filtros={filtros} cambiar={cambiar}
        limpiar={() => setFiltros(filtrosPorDefecto(pest))} />

      <NotaEnfoque def={DEF.indicadores[pest.id]} enfoque={filtros.enfoque}
        activos={enfoquesDisponibles(pest)} />

      <div id={'panel-' + pest.id} role="tabpanel" aria-labelledby={'tab-' + pest.id}>
        <Panel key={pest.id} pest={pest} filtros={filtros} />
        <SeccionProgramas pest={pest} filtros={filtros} />
      </div>

      <p className="dsh-nota">{DEF.nota}</p>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
