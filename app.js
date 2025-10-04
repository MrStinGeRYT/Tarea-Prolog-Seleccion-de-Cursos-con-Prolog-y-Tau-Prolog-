// =================== Estado global ===================
let session = null;
let prologCargado = false;
const pl = window.pl;

// =================== Bootstrap ===================
document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 DOM cargado, iniciando Prolog...");
  initProlog();
});

// =================== Wrappers Promesa ===================
function consultAsync(text) {
  return new Promise((resolve, reject) => {
    session.consult(text, { success: resolve, error: reject });
  });
}
function queryAsync(q) {
  return new Promise((resolve, reject) => {
    session.query(q, { success: resolve, error: reject });
  });
}
function answersAllAsync() {
  return new Promise((resolve) => {
    const results = [];
    const step = () => {
      session.answer(ans => {
        if (ans === false || ans === null) return resolve(results);
        results.push(ans);
        step();
      });
    };
    step();
  });
}

// helpers para leer variables desde la sustitución de Tau-Prolog:
function getVar(ans, name) {
  if (ans && typeof ans.lookup === "function") return ans.lookup(name);
  if (ans && ans.links) {
    return typeof ans.links.get === "function"
      ? ans.links.get(name)
      : ans.links[name];
  }
  return null;
}
function prologTermToString(t) {
  if (!t) return "";
  // Representación textual segura
  try { return pl.format_term(t); } catch { return String(t.id ?? t.value ?? t); }
}

// =================== Init Prolog ===================
async function initProlog() {
  try {
    if (typeof pl === 'undefined') throw new Error('Tau-Prolog no se cargó (revisa <script> de core.min.js).');
    console.log("✅ Tau-Prolog cargado");

    session = pl.create(10000);
    console.log("✅ Sesión creada");

    await cargarBaseConocimiento();
    console.log("✅ Base de conocimiento cargada");

    await configurarInterfaz();
    console.log("✅ Interfaz configurada");

    prologCargado = true;
    mostrarEstado('🟢 Sistema listo');
  } catch (err) {
    console.error("❌ Error crítico:", err);
    mostrarEstado('🔴 Error: ' + err.message);
  }
}

// =================== KB (tu versión, con fixes) ===================
async function cargarBaseConocimiento() {
  const base = `
% ---------- CURSOS ----------
cursos('PROGRAMACION 1', 1, 4).
cursos('MATEMATICAS 1', 1, 5).
cursos('FISICA 1', 1, 4).
cursos('HUMANIDADES 1', 1, 3).
cursos('PROGRAMACION 2', 2, 4).
cursos('MATEMATICAS 2', 2, 5).
cursos('FISICA 2', 2, 4).
cursos('BASE DE DATOS', 3, 4).
cursos('ESTRUCTURAS DE DATOS', 3, 5).

% ---------- PRERREQUISITOS ----------
prerrequisitos('PROGRAMACION 2', 'PROGRAMACION 1').
prerrequisitos('MATEMATICAS 2', 'MATEMATICAS 1').
prerrequisitos('FISICA 2', 'FISICA 1').
prerrequisitos('BASE DE DATOS', 'PROGRAMACION 1').
prerrequisitos('ESTRUCTURAS DE DATOS', 'PROGRAMACION 2').

% ---------- PROFESORES ----------
profesores('Dr. Garcia', 'PROGRAMACION 1').
profesores('Dra. Martinez', 'PROGRAMACION 2').
profesores('Dr. Rodriguez', 'MATEMATICAS 1').
profesores('Dra. Lopez', 'MATEMATICAS 2').
profesores('Dr. Hernandez', 'FISICA 1').
profesores('Dra. Perez', 'FISICA 2').
profesores('Dr. Sanchez', 'BASE DE DATOS').
profesores('Dra. Ramirez', 'ESTRUCTURAS DE DATOS').
profesores('Dr. Torres', 'HUMANIDADES 1').

% ---------- ALUMNOS ----------
alumnos('Juan Perez', 2).
alumnos('Maria Garcia', 1).
alumnos('Carlos Lopez', 3).
alumnos('Ana Martinez', 2).

% ---------- CURSOS APROBADOS ----------
cursos_aprobados('Juan Perez', 'PROGRAMACION 1', 85).
cursos_aprobados('Juan Perez', 'MATEMATICAS 1', 78).
cursos_aprobados('Juan Perez', 'FISICA 1', 82).
cursos_aprobados('Juan Perez', 'HUMANIDADES 1', 90).
cursos_aprobados('Maria Garcia', 'PROGRAMACION 1', 88).
cursos_aprobados('Carlos Lopez', 'PROGRAMACION 1', 92).
cursos_aprobados('Carlos Lopez', 'PROGRAMACION 2', 85).
cursos_aprobados('Carlos Lopez', 'MATEMATICAS 1', 79).
cursos_aprobados('Carlos Lopez', 'MATEMATICAS 2', 81).
cursos_aprobados('Ana Martinez', 'PROGRAMACION 1', 76).
cursos_aprobados('Ana Martinez', 'MATEMATICAS 1', 84).

% ---------- REGLAS ----------
puede_tomar(Alumno, Curso) :-
    alumnos(Alumno, SemActual),
    cursos(Curso, SemCurso, _),
    SemCurso =< SemActual + 1,
    \\+ cursos_aprobados(Alumno, Curso, _),
    forall(prerrequisitos(Curso, Pr), cursos_aprobados(Alumno, Pr, _)).
`;
  await consultAsync(base);
}

// =================== UI ===================
async function configurarInterfaz() {
  // Cargar alumnos
  const rows = await consultaProlog("alumnos(Nombre, Semestre).", ["Nombre","Semestre"]);
  const selAlumno = document.getElementById('alumno-select');
  const selTutor  = document.getElementById('tutor-alumno-select');

  selAlumno.innerHTML = '<option value="">-- Selecciona un alumno --</option>';
  selTutor.innerHTML  = '<option value="">-- Selecciona un alumno --</option>';

  rows.forEach(r => {
    const texto = `${r.Nombre} (Sem ${r.Semestre})`;
    selAlumno.add(new Option(texto, r.Nombre));
    selTutor.add(new Option(texto, r.Nombre));
  });

  selAlumno.addEventListener('change', cargarInfoAlumno);
  selTutor.addEventListener('change', cargarSeleccionTutor);

  document.getElementById('file-input')
    .addEventListener('change', e => cargarArchivoProlog(e.target.files?.[0]));
}

// Estado en Configuración
function mostrarEstado(msg) {
  document.getElementById('kb-status').textContent = msg;
  document.getElementById('config-results').innerHTML = `
    <div class="result-item"><strong>${msg}</strong>
      <p>Selecciona un modo en el menú lateral.</p>
      ${msg.includes('listo') ? '<p><strong>Ya deberías ver los alumnos en los selectores.</strong></p>' : ''}
    </div>`;
}

// =================== Núcleo de consultas ===================
async function consultaProlog(query, varNames) {
  try {
    await queryAsync(query);
    const subs = await answersAllAsync(); // array de sustituciones
    // Si no se pasó varNames, devuelvo sustitución formateada
    if (!varNames || !varNames.length) {
      return subs.map(s => ({ _: pl.format_answer(s) }));
    }
    // Mapeo variables pedidas a texto
    return subs.map(s => {
      const obj = {};
      varNames.forEach(v => {
        obj[v] = prologTermToString(getVar(s, v));
      });
      return obj;
    });
  } catch (e) {
    console.error("consultaProlog error:", e);
    return [];
  }
}

// =================== Navegación UI ===================
function showSection(seccion) {
  if (!prologCargado) {
    alert("⏳ El sistema todavía se está cargando. Espera un momento.");
    return;
  }
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`${seccion}-section`).classList.add('active');
  // Activar botón correspondiente
  const btn = [...document.querySelectorAll('.mode-btn')].find(b => b.getAttribute('onclick')?.includes(seccion));
  if (btn) btn.classList.add('active');
}

function cargarInfoAlumno() {
  const v = document.getElementById('alumno-select').value;
  document.getElementById('alumno-info').classList.toggle('hidden', !v);
}
function cargarSeleccionTutor() {
  const v = document.getElementById('tutor-alumno-select').value;
  document.getElementById('tutor-actions').classList.toggle('hidden', !v);
}

// =================== Acciones: Alumno ===================
async function verCursosDisponibles() {
  const alumno = document.getElementById('alumno-select').value;
  const out = document.getElementById('alumno-results');
  if (!alumno) return alert("❌ Selecciona un alumno.");

  out.innerHTML = '<div class="loading">Buscando cursos disponibles...</div>';

  const rows = await consultaProlog(
    `cursos(Curso, Semestre, Creditos), puede_tomar('${alumno}', Curso).`,
    ["Curso","Semestre","Creditos"]
  );

  if (!rows.length) {
    out.innerHTML = `
      <div class="result-item warning">
        <strong>No hay cursos disponibles</strong>
        <p>El alumno ${alumno} no tiene cursos disponibles ahora.</p>
      </div>`;
    return;
  }

  out.innerHTML = `<h3>📚 Cursos disponibles para ${alumno}</h3>
    <div class="cursos-grid">${
      rows.map(r => `
        <div class="curso-card">
          <div class="curso-header">
            <div class="curso-nombre">${r.Curso}</div>
            <div class="curso-semestre">Sem ${r.Semestre}</div>
          </div>
          <div class="curso-info">📊 ${r.Creditos} créditos</div>
          <div class="curso-info">✅ Disponible</div>
        </div>`).join('')
    }</div>`;
}
window.verCursosDisponibles = verCursosDisponibles;

async function verHistorial() {
  const alumno = document.getElementById('alumno-select').value;
  const out = document.getElementById('alumno-results');
  if (!alumno) return alert("❌ Selecciona un alumno.");

  out.innerHTML = '<div class="loading">Cargando historial...</div>';

  const aprob = await consultaProlog(
    `cursos_aprobados('${alumno}', Curso, Calificacion).`,
    ["Curso","Calificacion"]
  );
  const info  = await consultaProlog(
    `alumnos('${alumno}', Semestre).`,
    ["Semestre"]
  );

  let html = `
    <h3>📋 Historial de ${alumno}</h3>
    <div class="curso-info">📅 Semestre actual: ${info[0]?.Semestre || 'N/A'}</div>
    <div class="curso-info">✅ Cursos aprobados: ${aprob.length}</div>
  `;

  if (aprob.length) {
    html += '<div class="cursos-grid">';
    aprob.forEach(c => {
      const n = parseInt(c.Calificacion, 10);
      const color = n >= 80 ? '#27ae60' : n >= 70 ? '#f39c12' : '#e74c3c';
      html += `
        <div class="curso-card">
          <div class="curso-header">
            <div class="curso-nombre">${c.Curso}</div>
            <div style="background:${color};color:#fff;padding:4px 8px;border-radius:12px;font-size:.8em;">
              ${c.Calificacion}/100
            </div>
          </div>
          <div class="curso-info">✅ Aprobado</div>
        </div>`;
    });
    html += '</div>';
  } else {
    html += '<div class="result-item warning">No hay cursos aprobados registrados</div>';
  }
  out.innerHTML = html;
}
window.verHistorial = verHistorial;

// =================== Acciones: Tutor ===================
async function verProgresoAlumno() {
  const alumno = document.getElementById('tutor-alumno-select').value;
  const out = document.getElementById('tutor-results');
  if (!alumno) return alert("❌ Selecciona un alumno.");

  out.innerHTML = '<div class="loading">Analizando progreso...</div>';

  const aprob = await consultaProlog(`cursos_aprobados('${alumno}', Curso, _).`, ["Curso"]);
  const info  = await consultaProlog(`alumnos('${alumno}', Semestre).`, ["Semestre"]);
  const disp  = await consultaProlog(`cursos(Curso, _, _), puede_tomar('${alumno}', Curso).`, ["Curso"]);

  out.innerHTML = `
    <h3>📊 Progreso de ${alumno}</h3>
    <div class="result-item">
      <p>• Semestre actual: ${info[0]?.Semestre || 'N/A'}</p>
      <p>• Cursos aprobados: ${aprob.length}</p>
      <p>• Cursos disponibles ahora: ${disp.length}</p>
    </div>`;
}
window.verProgresoAlumno = verProgresoAlumno;

async function seleccionarCursos() {
  const alumno = document.getElementById('tutor-alumno-select').value;
  const out = document.getElementById('tutor-results');
  if (!alumno) return alert("❌ Selecciona un alumno.");

  out.innerHTML = '<div class="loading">Cargando cursos...</div>';

  const rows = await consultaProlog(
    `cursos(Curso, Semestre, Creditos), puede_tomar('${alumno}', Curso).`,
    ["Curso","Semestre","Creditos"]
  );

  if (!rows.length) {
    out.innerHTML = `<div class="result-item warning"><strong>No hay cursos disponibles</strong></div>`;
    return;
  }

  out.innerHTML = `
    <h3>🎯 Seleccionar cursos para ${alumno}</h3>
    <form id="form-seleccion-cursos">
      ${rows.map((r,i)=>`
        <div class="checkbox-group">
          <input type="checkbox" id="curso-${i}" name="curso" value="${r.Curso}">
          <label for="curso-${i}"><strong>${r.Curso}</strong> (Sem ${r.Semestre}, ${r.Creditos} créditos)</label>
        </div>`).join('')}
      <button type="button" class="btn" onclick="confirmarSeleccionCursos()">✅ Confirmar Selección</button>
    </form>`;
}
window.seleccionarCursos = seleccionarCursos;

function confirmarSeleccionCursos() {
  const alumno = document.getElementById('tutor-alumno-select').value;
  const checks = [...document.querySelectorAll('#form-seleccion-cursos input[type="checkbox"]:checked')];
  if (!checks.length) return alert("❌ Selecciona al menos un curso.");

  const out = document.getElementById('tutor-results');
  out.innerHTML = `
    <div class="result-item">
      <strong>✅ Selección confirmada</strong>
      <p>Para: <strong>${alumno}</strong></p>
      <ul>${checks.map(c=>`<li>📚 ${c.value}</li>`).join('')}</ul>
      <p><em>(Aquí podrías guardar la selección en otra KB/persistencia)</em></p>
    </div>`;
}
window.confirmarSeleccionCursos = confirmarSeleccionCursos;

// =================== Cargar archivo externo .pl ===================
async function cargarArchivoProlog(archivo) {
  if (!archivo) return;
  const out = document.getElementById('config-results');
  out.innerHTML = '<div class="loading">Procesando archivo...</div>';
  try {
    const text = await archivo.text();
    // Reinicio de sesión para evitar mezclar KBs
    session = pl.create(10000);
    await consultAsync(text);
    await configurarInterfaz();
    prologCargado = true;
    out.innerHTML = `
      <div class="result-item">
        <strong>✅ Archivo cargado exitosamente</strong>
        <p>Archivo: <strong>${archivo.name}</strong></p>
      </div>`;
  } catch (e) {
    console.error(e);
    out.innerHTML = `<div class="result-item error"><strong>❌ Error</strong><p>${e.message}</p></div>`;
  }
}
