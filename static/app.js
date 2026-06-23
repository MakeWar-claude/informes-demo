/* ===========================================================================
   Informes — DEMO. Lógica de cliente (vanilla JS).
   Flujo: Pendientes (cola) -> asignar -> Informe (según tipo) -> Mis estudios.
   =========================================================================== */
const $ = id => document.getElementById(id);
const api = (u, o) => fetch(u, o).then(r => r.json());

let ESTUDIOS = [];          // worklist ligero
let CAP = {voz:false, ia:false, modelo:"claude-sonnet-4-6"};
const ASIGNADOS = new Set(JSON.parse(localStorage.getItem("demo_asignados") || "[]"));
const GUARDADOS = JSON.parse(localStorage.getItem("demo_guardados") || "{}"); // id -> {informe, ts}
let detalleCache = {};      // id -> estudio completo

const esc = s => (s == null ? "" : String(s)).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const persistAsignados = () => localStorage.setItem("demo_asignados", JSON.stringify([...ASIGNADOS]));
const persistGuardados = () => localStorage.setItem("demo_guardados", JSON.stringify(GUARDADOS));

function grupoBadge(g){ return g==="pet"?"PET":(g==="cardio"?"CARDIO":"MN"); }

/* ----------------------------------------------------------------- init --- */
async function init(){
  try{ CAP = await api("/api/estado"); }catch(e){}
  pintarEstado();
  const data = await api("/api/estudios");
  ESTUDIOS = data.estudios || [];
  renderWorklist("todos");
  // tabs
  document.querySelectorAll(".tab-btn").forEach(b=>b.onclick=()=>mostrarTab(b.dataset.tab));
  document.querySelectorAll("#filtros button").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("#filtros button").forEach(x=>x.classList.remove("activo"));
    b.classList.add("activo"); renderWorklist(b.dataset.f);
  });
}

function pintarEstado(){
  const partes=[];
  partes.push(CAP.ia ? "IA en directo ("+CAP.modelo+")" : "IA pre-cocinada");
  partes.push(CAP.voz ? "voz Whisper online" : "voz: dictado de ejemplo");
  $("estadoTxt").textContent = partes.join(" · ");
  $("dotEstado").className = "dot " + ((CAP.ia||CAP.voz)?"ok":"off");
}

function mostrarTab(t){
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("activo", b.dataset.tab===t));
  $("mainPendientes").classList.toggle("hidden", t!=="pendientes");
  $("mainInforme").classList.toggle("hidden", t!=="informe");
  $("mainEstudios").classList.toggle("hidden", t!=="estudios");
  if(t==="estudios") renderEstudios();
}

/* ------------------------------------------------------------- worklist --- */
function renderWorklist(filtro){
  const body=$("worklistBody"); body.innerHTML="";
  const lista = ESTUDIOS.filter(e=>filtro==="todos"||e.tipo_grupo===filtro);
  if(!lista.length){ body.innerHTML='<tr><td colspan="5" class="muted" style="text-align:center;padding:24px">Sin estudios</td></tr>'; return; }
  for(const e of lista){
    const tr=document.createElement("tr");
    if(ASIGNADOS.has(e.id)) tr.className="asignado";
    const g=grupoBadge(e.tipo_grupo);
    const fase = e.fase ? `<span class="fase-pill ${e.fase}">${e.fase}</span>` : "";
    tr.innerHTML=`
      <td>${esc(fmtFecha(e.fecha))}</td>
      <td><strong>${esc(e.paciente.nombre)}</strong><br><span class="muted small">${esc(e.paciente.edad)} a · ${e.paciente.sexo==="F"?"♀":"♂"} · NHC ${esc(e.paciente.nhc)}</span></td>
      <td><span class="badge-mod ${g}">${g}</span> ${esc(e.descripcion)}${fase}</td>
      <td class="muted small">${esc(e.sala)}</td>
      <td style="text-align:right" id="acc-${e.id}"></td>`;
    body.appendChild(tr);
    pintarAccion(e);
  }
}

function pintarAccion(e){
  const cell=$("acc-"+e.id); if(!cell) return;
  if(!ASIGNADOS.has(e.id)){
    cell.innerHTML=`<button class="btn-mas" title="Asignármelo">+</button>`;
    cell.querySelector("button").onclick=()=>{ ASIGNADOS.add(e.id); persistAsignados(); pintarAccion(e);
      cell.closest("tr").className="asignado"; };
    return;
  }
  // asignado: el botón depende del tipo
  let cls="dictar", txt="📝 Abrir";
  if(e.tipo_grupo==="cardio" && e.fase==="reposo"){ cls="anamnesis"; txt="📋 Anamnesis"; }
  else if(e.tipo_grupo==="cardio" && e.fase==="esfuerzo"){ cls="dictar"; txt="🎙️ Dictar"; }
  else { cls="dictar"; txt="🎙️ Dictar"; }
  cell.innerHTML=`<button class="btn-abrir ${cls}">${txt}</button>`;
  cell.querySelector("button").onclick=()=>abrir(e.id);
}

function fmtFecha(iso){ if(!iso) return ""; const p=iso.split("-"); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso; }

/* --------------------------------------------------------- abrir estudio --- */
async function abrir(id){
  let e=detalleCache[id];
  if(!e){ e=await api("/api/estudio/"+id); detalleCache[id]=e; }
  mostrarTab("informe");
  const m=$("mainInforme"); m.className=""; m.innerHTML="";
  if(e.tipo_grupo==="cardio" && e.fase==="reposo") return renderAnamnesis(e, m);
  if(e.tipo_grupo==="cardio" && e.fase==="esfuerzo") return renderCardioEsfuerzo(e, m);
  return renderPET(e, m);
}

function cabecera(e, extra=""){
  return `<span class="volver" onclick="mostrarTab('pendientes')">← Volver a pendientes</span>
    <div class="panel">
      <h2>${esc(e.descripcion)} ${extra}</h2>
      <div class="demo-grid">
        <div><div class="label">Paciente</div><div class="valor">${esc(e.paciente.nombre)}</div></div>
        <div><div class="label">Edad / Sexo</div><div class="valor">${esc(e.paciente.edad)} años · ${e.paciente.sexo==="F"?"Mujer":"Hombre"}</div></div>
        <div><div class="label">NHC</div><div class="valor">${esc(e.paciente.nhc)}</div></div>
        <div><div class="label">Fecha</div><div class="valor">${esc(fmtFecha(e.fecha))}</div></div>
        <div><div class="label">Sala</div><div class="valor">${esc(e.sala)}</div></div>
      </div>
    </div>`;
}

/* ===================================================== PET / MN flow ====== */
function renderPET(e, m){
  m.className="cols";
  const previos=(e.previos||[]).map((p,i)=>`
    <details class="previo">
      <summary><input type="checkbox" class="chk-comparar" data-i="${i}"><span class="fecha">${esc(fmtFecha(p.fecha))}</span><span class="tipo">${esc(p.descripcion)}</span></summary>
      <div class="texto-informe">${esc(p.resumen)}</div>
    </details>`).join("");

  m.innerHTML=`
   <div>
    ${cabecera(e)}
    <div class="panel">
      <h2>Indicación clínica</h2>
      <div class="motivo-panel">
        <h3>Motivo (RIS)</h3>
        <div class="raw">${esc(e.motivo_raw)}</div>
        <div class="refinado hidden" id="motivoRef"></div>
      </div>
      <button class="secundario" id="btnRefinar">✨ Refinar con IA</button>
    </div>
    ${previos?`<div class="panel"><h2>Estudios previos</h2>${previos}<div class="aviso small" style="margin-top:8px">Marca un previo para comparar evolutivamente.</div></div>`:""}
    <div class="panel">
      <h2>Dictado</h2>
      <div class="grabar-zona" id="zona">
        <span class="dot"></span>
        <button class="grande" id="btnGrabar">🎙️ Grabar</button>
        <span class="timer" id="timer">00:00</span>
      </div>
      <div class="dictado-estado" id="dictadoEstado"></div>
      <div class="btn-row">
        <button class="secundario" id="btnEjemplo">Usar dictado de ejemplo</button>
        <button class="grande primario" id="btnEstructurar" style="background:linear-gradient(135deg,var(--primary),var(--action-leer));color:#fff">⚙️ Estructurar informe</button>
      </div>
    </div>
   </div>
   <div>
    <div class="panel">
      <h2>Informe <span id="modoBadge"></span></h2>
      <textarea class="informe" id="informe" placeholder="El informe estructurado aparecerá aquí…"></textarea>
      <div class="btn-row">
        <button class="secundario" id="btnCopiar">📋 Copiar</button>
        <button class="grande" id="btnGuardar">💾 Guardar</button>
      </div>
    </div>
   </div>`;

  // refinar (pre-cocinado)
  $("btnRefinar").onclick=async()=>{
    $("btnRefinar").disabled=true; $("btnRefinar").textContent="Refinando…";
    const r=await api("/api/refinar_motivo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:e.id})});
    const el=$("motivoRef"); el.classList.remove("hidden");
    el.innerHTML="<strong style='color:var(--action-dictar-hover)'>Refinado IA → </strong>"+esc(r.motivo);
    $("btnRefinar").textContent="✓ Refinado";
  };
  // dictado oculto (solo estado por partes)
  const store={bloques:[]};
  conectarDictado(store, {estadoElId:"dictadoEstado"});
  $("btnEjemplo").onclick=()=>{ if(e.dictado_ejemplo){ store.bloques=[e.dictado_ejemplo];
    renderDictEstado("dictadoEstado", store, "Dictado de ejemplo cargado (1 parte)."); }
    else renderDictEstado("dictadoEstado", store, "Este estudio no trae dictado de ejemplo."); };

  // selección de previos para comparar
  document.querySelectorAll(".chk-comparar").forEach(chk=>chk.onchange=()=>{
    chk.closest("details").classList.toggle("seleccionado", chk.checked); });

  $("btnEstructurar").onclick=()=>{
    const previosSel=[...document.querySelectorAll(".chk-comparar:checked")].map(c=>(e.previos||[])[+c.dataset.i]).filter(Boolean);
    estructurar(e, dictTexto(store), $("informe"), $("modoBadge"), previosSel);
  };
  $("btnCopiar").onclick=()=>copiar($("informe").value);
  $("btnGuardar").onclick=()=>guardar(e, $("informe").value);
  if(GUARDADOS[e.id]){ $("informe").value=GUARDADOS[e.id].informe; }
}

/* ============================================ CARDIO · reposo (anamnesis) = */
function renderAnamnesis(e, m){
  const a=e.anamnesis||{};
  const ant=a.antecedentes||{}, s=a.sintomas||{}, eac=a.eac||{};
  const chk=(v,lbl)=>`<span class="chip ${v?"":"neg"}">${v?"✓ ":"— "}${lbl}</span>`;
  const trat=(a.tratamiento||[]).map(t=>`<div class="fila-medic"><span>${esc(t.farmaco)}</span><span class="muted">${esc(t.dosis)}</span><span class="muted">${esc(t.posologia)}</span></div>`).join("")||'<span class="muted small">Sin tratamiento registrado</span>';

  m.innerHTML=`
    ${cabecera(e, '<span class="fase-pill reposo">reposo</span>')}
    <div class="aviso" style="margin-bottom:16px">Estudio de <strong>reposo</strong>: se cumplimenta la <strong>hoja de anamnesis</strong>. El informe se emitirá junto con el estudio de esfuerzo del mismo paciente.</div>

    <div class="card">
      <div class="sec">Datos administrativos</div>
      <div class="g3">
        <div class="kv"><span class="k">Servicio</span><span class="v">${esc(a.servicio_solicitante)}</span></div>
        <div class="kv"><span class="k">Régimen</span><span class="v">${esc(a.regimen)}</span></div>
        <div class="kv"><span class="k">Protocolo</span><span class="v">${esc(a.protocolo)}</span></div>
        <div class="kv"><span class="k">Peso</span><span class="v">${esc(a.peso_kg)} kg</span></div>
        <div class="kv"><span class="k">Altura</span><span class="v">${esc(a.altura_cm)} cm</span></div>
        <div class="kv"><span class="k">Motivo</span><span class="v">${esc(a.motivo_exploracion)}</span></div>
      </div>
    </div>

    <div class="card">
      <div class="sec">Enfermedad coronaria</div>
      <div class="g2">
        <div class="kv"><span class="k">Estado EAC</span><span class="v">${esc(eac.estado||"—")}</span></div>
        <div class="kv"><span class="k">Ritmo/conducción</span><span class="v">${esc(eac.ritmo||"Sin alteraciones")}</span></div>
      </div>
      ${eac.vasos?`<div class="kv" style="margin-top:10px"><span class="k">Vasos / revascularización</span><span class="v">${esc(eac.vasos)}</span></div>`:""}
      ${eac.infarto?`<div class="kv" style="margin-top:10px"><span class="k">Infarto previo</span><span class="v">${esc(eac.infarto)}</span></div>`:""}
    </div>

    <div class="card">
      <div class="sec">Sintomatología</div>
      <div class="chips">
        ${chk(s.presenta,"Sintomático")}
        ${chk(s.disnea,"Disnea")}
        ${chk(s.dolor_toracico,"Dolor torácico"+(s.tipo_dolor?" ("+s.tipo_dolor+")":""))}
        ${chk(s.palpitaciones,"Palpitaciones")}
        ${chk(s.sincope,"Síncope")}
      </div>
      ${s.otros?`<div class="kv" style="margin-top:10px"><span class="k">Otros</span><span class="v">${esc(s.otros)}</span></div>`:""}
    </div>

    <div class="card">
      <div class="sec">Factores de riesgo / antecedentes</div>
      <div class="chips">
        ${chk(ant.hta,"HTA")} ${chk(ant.hipercolesterolemia,"Dislipemia")}
        ${chk(ant.diabetes,"Diabetes"+(ant.tipo_diabetes?" ("+ant.tipo_diabetes+")":""))}
        ${chk(ant.tabaco,"Tabaquismo")} ${chk(ant.obesidad,"Obesidad")}
        ${chk(ant.epoc,"EPOC")} ${chk(ant.irc,"IRC")}
      </div>
      ${ant.alergias?`<div class="kv" style="margin-top:10px"><span class="k">Alergias</span><span class="v">${esc(ant.alergias)}</span></div>`:""}
      ${ant.otros?`<div class="kv" style="margin-top:6px"><span class="k">Otros</span><span class="v">${esc(ant.otros)}</span></div>`:""}
    </div>

    <div class="card">
      <div class="sec">Tratamiento actual</div>
      ${trat}
    </div>
    <div class="btn-row"><button class="secundario" onclick="mostrarTab('pendientes')">✓ Guardar y volver</button></div>`;
}

/* ============================================ CARDIO · esfuerzo (dictado) = */
function renderCardioEsfuerzo(e, m){
  const c=e.protocolo_campos||{};
  const fis = (c.protocolo==="Esfuerzo fisico");
  const a=e.anamnesis||{};
  const campo=(id,lbl,val,suf="")=>`<div><label>${lbl}</label><input id="pc_${id}" value="${val??""}">${suf}</div>`;

  m.innerHTML=`
    ${cabecera(e, '<span class="fase-pill esfuerzo">esfuerzo</span>')}
    <details class="card" style="padding:0">
      <summary class="sec" style="cursor:pointer;padding:16px 20px;margin:0;border-bottom:none">Anamnesis del paciente (resumen) ▾</summary>
      <div style="padding:0 20px 18px">
        <div class="chips">
          ${a.antecedentes?.hta?'<span class="chip">HTA</span>':''}
          ${a.antecedentes?.diabetes?'<span class="chip">DM</span>':''}
          ${a.antecedentes?.hipercolesterolemia?'<span class="chip">Dislipemia</span>':''}
          ${a.antecedentes?.tabaco?'<span class="chip">Tabaco</span>':''}
          ${a.eac?.estado?'<span class="chip red">EAC '+esc(a.eac.estado)+'</span>':''}
        </div>
        <div class="kv" style="margin-top:10px"><span class="k">Motivo</span><span class="v">${esc(a.motivo_exploracion||"")}</span></div>
      </div>
    </details>

    <div class="dictar-campos">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <strong style="color:#6d28d9">🎙️ Dictar campos del protocolo</strong>
        <button class="secundario" id="btnDictarCampos" style="padding:7px 16px">Grabar campos</button>
        <span class="timer" id="timerC">00:00</span>
      </div>
      <div class="ayuda">Dicta los valores, p. ej.: «farmacológico, FEVI 60, VTD 110, SSS 9, SRS 3, FC reposo 70, máxima 92, TA 140/80, TID 1.34». Se rellenan los campos de abajo para que los revises.</div>
      <div class="dictado-estado" id="estadoCamposBox" style="margin-top:6px"></div>
    </div>

    <div class="card">
      <div class="sec">Constantes y cuantificación · prueba de esfuerzo</div>
      <div class="g4">
        ${campo("fc_reposo","FC reposo (lpm)",c.fc_reposo)}
        ${campo("ta_reposo","TA reposo",c.ta_reposo)}
        ${campo("fc_maxima","FC máxima",c.fc_maxima)}
        ${campo("fc_final","FC final",c.fc_final)}
        ${campo("ta_final","TA final",c.ta_final)}
        ${campo("fevi","FEVI (%)",c.fevi)}
        ${campo("vtd","VTD (ml)",c.vtd)}
        ${campo("vts","VTS (ml)",c.vts)}
        ${campo("fevi_estres","FEVI esfuerzo",c.fevi_estres)}
        ${campo("tid","TID",c.tid)}
        ${campo("sss","SSS",c.sss)}
        ${campo("srs","SRS",c.srs)}
        ${campo("sds","SDS",c.sds)}
      </div>
      <div class="g3 ${fis?"":"hidden"}" id="bloqueFisico" style="margin-top:12px">
        ${campo("mets","METs",c.mets)}
        ${campo("etapa_bruce","Etapa Bruce",c.etapa_bruce)}
        ${campo("duracion_min","Duración (min)",c.duracion_min)}
        ${campo("motivo_parada","Motivo parada",c.motivo_parada)}
        ${campo("pct_fc_max","% FC máx. teórica",c.pct_fc_max)}
        ${campo("ecg_cambios","ECG esfuerzo",c.ecg_cambios)}
      </div>
    </div>

    <div class="card">
      <div class="sec">Impresión visual (dictado)</div>
      <div class="grabar-zona" id="zona"><span class="dot"></span>
        <button class="grande" id="btnGrabar">🎙️ Grabar</button>
        <span class="timer" id="timer">00:00</span></div>
      <div class="dictado-estado" id="dictadoEstado"></div>
      <div class="btn-row">
        <button class="secundario" id="btnEjemplo">Usar dictado de ejemplo</button>
        <button class="grande primario" id="btnEstructurar" style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff">✨ Generar informe</button>
      </div>
    </div>

    <div class="card">
      <div class="sec">Informe generado <span id="modoBadge"></span></div>
      <textarea class="informe" id="informe" placeholder="El informe de perfusión miocárdica aparecerá aquí…"></textarea>
      <div class="btn-row">
        <button class="secundario" id="btnCopiar">📋 Copiar</button>
        <button class="grande" id="btnGuardar">💾 Guardar</button>
      </div>
    </div>`;

  // dictar campos -> transcribe (oculto) -> parsea -> rellena inputs
  const storeCampos={bloques:[]};
  conectarDictado(storeCampos, {btnId:"btnDictarCampos", timerId:"timerC", estadoElId:"estadoCamposBox",
    zonaId:"__nozone", onText:st=>{ parsearCampos(dictTexto(st)); renderDictEstado("estadoCamposBox", st, "Campos rellenados ✓"); }});

  // impresión visual (oculta, solo estado)
  const store={bloques:[]};
  conectarDictado(store, {estadoElId:"dictadoEstado"});
  $("btnEjemplo").onclick=()=>{ if(e.dictado_ejemplo){ store.bloques=[e.dictado_ejemplo];
    renderDictEstado("dictadoEstado", store, "Dictado de ejemplo cargado (1 parte)."); } };
  $("btnEstructurar").onclick=()=>estructurar(e, dictTexto(store), $("informe"), $("modoBadge"));
  $("btnCopiar").onclick=()=>copiar($("informe").value);
  $("btnGuardar").onclick=()=>guardar(e, $("informe").value);
  if(GUARDADOS[e.id]) $("informe").value=GUARDADOS[e.id].informe;
}

// parser ligero de campos dictados (demo) — rellena inputs por palabras clave
function parsearCampos(txt){
  const t=txt.toLowerCase().replace(/,/g,".");
  const num=(re)=>{ const mm=t.match(re); return mm?mm[1]:null; };
  const set=(id,v)=>{ if(v!=null && $("pc_"+id)) $("pc_"+id).value=v; };
  set("fevi", num(/fevi\s*(\d{1,3})/));
  set("vtd", num(/vtd\s*(\d{1,3})/));
  set("vts", num(/vts\s*(\d{1,3})/));
  set("sss", num(/sss\s*(\d{1,2})/));
  set("srs", num(/srs\s*(\d{1,2})/));
  set("tid", num(/tid\s*(\d(?:\.\d+)?)/));
  set("fc_reposo", num(/(?:fc\s*)?reposo\s*(\d{2,3})/));
  set("fc_maxima", num(/m[aá]x\w*\s*(\d{2,3})/));
  const ta=t.match(/(\d{2,3})\s*\/\s*(\d{2,3})/); if(ta && $("pc_ta_reposo")) $("pc_ta_reposo").value=ta[1]+"/"+ta[2];
}

/* ----------------------------------------------- estructurar (Claude) ----- */
async function estructurar(e, dictado, outEl, badgeEl, previos){
  outEl.value="Generando informe…";
  badgeEl.innerHTML="";
  try{
    const r=await api("/api/estructurar",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({id:e.id, dictado, modelo:CAP.modelo, previos:previos||[]})});
    outEl.value=r.informe||"(sin respuesta)";
    const directo=(r.modo||"").startsWith("en-directo");
    badgeEl.innerHTML=`<span class="modo-badge ${directo?"directo":"precocinado"}">${esc(r.modo||"")}</span>`;
  }catch(ex){ outEl.value="Error: "+ex; }
}

/* ------------------------------------------------------- grabación voz -----
   El TEXTO del dictado NO se muestra (como en la app real). Solo se ve el
   estado: partes transcritas (1, 2, …) y el estado en curso. El texto vive en
   store.bloques y se usa al estructurar. -------------------------------------*/
const mmss=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");

function renderDictEstado(elId, store, transient){
  const el=$(elId); if(!el) return;
  let html=store.bloques.map((b,i)=>`<div class="bloque-linea">✓ Parte ${i+1} transcrita</div>`).join("");
  if(transient) html+=`<div class="bloque-hint">${esc(transient)}</div>`;
  if(!html) html=`<div class="bloque-hint">Sin dictado todavía. Pulsa <b>Grabar</b> (puedes dictar en varias partes) o usa el dictado de ejemplo.</div>`;
  el.innerHTML=html;
}

function conectarDictado(store, {btnId="btnGrabar", timerId="timer", estadoElId="dictadoEstado", onText=null, zonaId="zona"}={}){
  const btn=$(btnId); if(!btn) return;
  const zona=$(zonaId);
  let rec=null, chunks=[], t0=0, timer=null;
  renderDictEstado(estadoElId, store);
  btn.onclick=async()=>{
    if(rec && rec.state==="recording"){ rec.stop(); return; }
    if(!CAP.voz){ renderDictEstado(estadoElId, store, "Voz online no configurada — usa «dictado de ejemplo»."); return; }
    let stream;
    try{ stream=await navigator.mediaDevices.getUserMedia({audio:true}); }
    catch(err){ renderDictEstado(estadoElId, store, "Micrófono denegado."); return; }
    chunks=[]; rec=new MediaRecorder(stream);
    rec.ondataavailable=ev=>{ if(ev.data.size) chunks.push(ev.data); };
    rec.onstart=()=>{ btn.textContent="⏹ Detener"; if(zona) zona.classList.add("grabando");
      renderDictEstado(estadoElId, store, "● Grabando parte "+(store.bloques.length+1)+"…");
      t0=performance.now(); timer=setInterval(()=>{ if($(timerId)) $(timerId).textContent=mmss(Math.floor((performance.now()-t0)/1000)); },250); };
    rec.onstop=async()=>{
      clearInterval(timer); btn.textContent="🎙️ Grabar";
      if(zona){zona.classList.remove("grabando");zona.classList.add("procesando");}
      renderDictEstado(estadoElId, store, "Transcribiendo parte "+(store.bloques.length+1)+"…");
      stream.getTracks().forEach(t=>t.stop());
      const fd=new FormData(); fd.append("audio", new Blob(chunks,{type:"audio/webm"}), "audio.webm");
      try{
        const j=await (await fetch("/api/transcribir",{method:"POST",body:fd})).json();
        if(j.texto){ store.bloques.push(j.texto); renderDictEstado(estadoElId, store); if(onText) onText(store); }
        else renderDictEstado(estadoElId, store, j.error||"sin texto");
      }catch(ex){ renderDictEstado(estadoElId, store, "error de transcripción"); }
      if(zona) zona.classList.remove("procesando");
    };
    rec.start();
  };
}
const dictTexto=store=>store.bloques.join(" ").trim();

/* ----------------------------------------------------------- guardar ------- */
function copiar(txt){ navigator.clipboard.writeText(txt||""); }
function guardar(e, informe){
  if(!informe||!informe.trim()){ alert("No hay informe que guardar."); return; }
  GUARDADOS[e.id]={informe, ts:new Date().toISOString(), desc:e.descripcion, paciente:e.paciente.nombre, grupo:e.tipo_grupo};
  persistGuardados();
  alert("Informe guardado en «Mis estudios».");
}
function renderEstudios(){
  const body=$("estudiosBody"); const ids=Object.keys(GUARDADOS);
  if(!ids.length){ body.innerHTML='<div class="panel"><span class="muted">Aún no has guardado ningún informe en esta sesión.</span></div>'; return; }
  body.innerHTML='<div class="panel"><h2>Informes guardados (esta sesión)</h2></div>';
  for(const id of ids){
    const g=GUARDADOS[id];
    const div=document.createElement("div"); div.className="panel";
    div.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
        <div><strong>${esc(g.paciente)}</strong> · ${esc(g.desc)} <span class="muted small">— ${esc(g.ts.slice(0,16).replace("T"," "))}</span></div>
        <button class="secundario btnReabrir">Abrir</button></div>
      <div class="report-box" style="margin-top:10px;max-height:260px;overflow:auto">${esc(g.informe)}</div>`;
    div.querySelector(".btnReabrir").onclick=()=>abrir(parseInt(id,10));
    body.appendChild(div);
  }
}

init();
