#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Informes — DEMO web pública
===========================
Versión de demostración (datos 100% inventados) de la app de dictado guiado
de informes de Medicina Nuclear. Pensada para alojar en un hosting barato y
enseñarla por enlace.

Qué es "en directo" y qué está pre-cocinado (según el encargo):
  - Motivo (indicación cruda)            -> pre-cocinado (viene del dataset)
  - Motivo refinado por IA               -> pre-cocinado (se muestra "como si"
                                            lo refinara la IA, sin llamada real)
  - Transcripción de voz (Whisper)       -> EN DIRECTO si hay GROQ/OPENAI key
                                            (si no, se ofrece dictado de ejemplo)
  - Estructuración del informe (Claude)  -> EN DIRECTO si hay ANTHROPIC key
                                            (si no, cae al informe pre-cocinado)

Variables de entorno (todas opcionales; sin ellas la demo funciona en modo
"pre-cocinado" y nunca se rompe):
  ANTHROPIC_API_KEY   -> activa la estructuración en directo con Claude
  DEMO_MODEL          -> modelo Claude (def. claude-sonnet-4-6)
  GROQ_API_KEY        -> activa Whisper en directo (whisper-large-v3-turbo)
  OPENAI_API_KEY      -> alternativa a Groq para Whisper (whisper-1)
  PORT                -> puerto (def. 5005)
"""
import os
import json
import io
import requests
from flask import Flask, request, jsonify, send_from_directory

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "data", "estudios_demo.json")

app = Flask(__name__, static_folder=os.path.join(BASE, "static"), static_url_path="/static")
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB audio

DEMO_MODEL = os.environ.get("DEMO_MODEL", "claude-sonnet-4-6")

# --- limitador sencillo (la clave es pública en la demo): N llamadas/hora/proceso
import time
import threading
_RL_LOCK = threading.Lock()
_RL = {}
DEMO_MAX_CALLS = int(os.environ.get("DEMO_MAX_CALLS", "300"))
DEMO_WINDOW = 3600


def _rate_ok(bucket):
    now = time.time()
    with _RL_LOCK:
        xs = [t for t in _RL.get(bucket, []) if now - t < DEMO_WINDOW]
        if len(xs) >= DEMO_MAX_CALLS:
            _RL[bucket] = xs
            return False
        xs.append(now)
        _RL[bucket] = xs
        return True


# ---------------------------------------------------------------- dataset ----
def cargar_estudios():
    with open(DATA, encoding="utf-8") as f:
        return json.load(f).get("estudios", [])


_CACHE = {"estudios": None}


def estudios():
    if _CACHE["estudios"] is None:
        _CACHE["estudios"] = cargar_estudios()
    return _CACHE["estudios"]


def get_estudio(eid):
    for e in estudios():
        if int(e.get("id")) == int(eid):
            return e
    return None


# ----------------------------------------------------------------- rutas -----
@app.after_request
def _cors(resp):
    # la pantalla de "calentando motores" (GitHub Pages) consulta /healthz
    resp.headers["Access-Control-Allow-Origin"] = "*"
    return resp


@app.route("/healthz")
def healthz():
    return jsonify({"ok": True})


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/estudios")
def api_estudios():
    """Worklist: devuelve la lista (sin los campos pesados pre-cocinados)."""
    ligero = []
    for e in estudios():
        ligero.append({
            "id": e["id"], "tipo_grupo": e["tipo_grupo"], "subtipo": e.get("subtipo", ""),
            "fase": e.get("fase", ""), "par_id": e.get("par_id"),
            "procedure_code": e.get("procedure_code", ""), "descripcion": e.get("descripcion", ""),
            "paciente": e.get("paciente", {}), "fecha": e.get("fecha", ""),
            "sala": e.get("sala", ""), "estado": e.get("estado", "pendiente"),
        })
    return jsonify({"estudios": ligero})


@app.route("/api/estudio/<int:eid>")
def api_estudio(eid):
    """Detalle completo de un estudio (al asignárselo / abrirlo)."""
    e = get_estudio(eid)
    if not e:
        return jsonify({"error": "no existe"}), 404
    return jsonify(e)


@app.route("/api/refinar_motivo", methods=["POST"])
def api_refinar_motivo():
    """Pre-cocinado: devuelve el motivo ya refinado del dataset (sin IA real)."""
    p = request.get_json() or {}
    e = get_estudio(p.get("id"))
    if not e:
        return jsonify({"error": "no existe"}), 404
    return jsonify({"motivo": e.get("motivo_refinado", e.get("motivo_raw", "")),
                    "tipo_detectado": e.get("subtipo", "")})


@app.route("/api/transcribir", methods=["POST"])
def api_transcribir():
    """Whisper EN DIRECTO (Groq u OpenAI). Recibe el audio del navegador
    (webm/opus) como multipart 'audio'. Sin clave -> 503 para que el front
    ofrezca el dictado de ejemplo."""
    groq = os.environ.get("GROQ_API_KEY")
    openai = os.environ.get("OPENAI_API_KEY")
    f = request.files.get("audio")
    if not f:
        return jsonify({"error": "sin audio"}), 400
    if not _rate_ok("voz"):
        return jsonify({"error": "límite de la demo alcanzado, prueba más tarde"}), 429
    blob = f.read()
    nombre = f.filename or "audio.webm"
    try:
        if groq:
            r = requests.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {groq}"},
                files={"file": (nombre, io.BytesIO(blob), f.mimetype or "audio/webm")},
                data={"model": "whisper-large-v3-turbo", "language": "es",
                      "temperature": "0", "response_format": "json"},
                timeout=120,
            )
            r.raise_for_status()
            return jsonify({"texto": r.json().get("text", "").strip()})
        if openai:
            r = requests.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {openai}"},
                files={"file": (nombre, io.BytesIO(blob), f.mimetype or "audio/webm")},
                data={"model": "whisper-1", "language": "es"},
                timeout=120,
            )
            r.raise_for_status()
            return jsonify({"texto": r.json().get("text", "").strip()})
    except Exception as ex:
        return jsonify({"error": f"transcripcion: {ex}"}), 502
    return jsonify({"error": "sin_clave_voz"}), 503


# ------------------------------------------------- estructuración (Claude) ---
SYS_PET_FALLBACK = (
    "Eres un sistema que reestructura el dictado telegráfico de un médico nuclear "
    "en un informe formal de PET/CT o Medicina Nuclear convencional, en español, "
    "con el estilo de la casa. Reglas: el informe lleva TÍTULO con la fecha, una "
    "apertura estándar, HALLAZGOS en orden craneocaudal con negaciones canónicas de "
    "lo no mencionado, y una CONCLUSIÓN breve. No inventes cifras: si el médico no "
    "dicta un SUV/medida, no lo pongas. No incluyas datos de paciente, centro ni firma. "
    "Si se aportan ESTUDIOS PREVIOS PARA COMPARACIÓN, realiza una comparación evolutiva: "
    "menciona explícitamente la comparación con el/los estudio(s) previo(s) por su fecha, "
    "describe los cambios (lesiones nuevas, desaparecidas, mayor o menor captación/tamaño) "
    "e incorpora en la conclusión la valoración de la respuesta/evolución. "
    "Devuelve SOLO el texto del informe."
)
SYS_CARDIO_FALLBACK = (
    "Eres un sistema que redacta el informe de SPECT de perfusión miocárdica en "
    "español con el estilo de la casa, a partir de datos estructurados (constantes, "
    "FEVI, volúmenes, SSS/SRS/SDS, TID) y de la impresión visual dictada. Estructura: "
    "apertura con las fechas de reposo y esfuerzo, datos clínicos, bloque de la prueba "
    "(farmacológica o esfuerzo físico con METs/Bruce/ECG), técnica, descripción de la "
    "perfusión y cuantificación, función ventricular (gated), y conclusión con tipo de "
    "isquemia y carga isquémica (SDS%). No inventes cifras que no estén en los datos. "
    "Devuelve SOLO el texto del informe."
)


def _cargar_prompt(nombre, fallback):
    """Carga el prompt REAL desde secret file de Render (privado, fuera del repo);
    si no existe, usa el condensado. Busca prompt_<nombre>.txt junto a la app o en
    /etc/secrets, o la ruta indicada en PROMPT_<NOMBRE>."""
    cand = []
    env = os.environ.get("PROMPT_" + nombre.upper())
    if env:
        cand.append(env)
    cand += [os.path.join(BASE, f"prompt_{nombre}.txt"),
             f"/etc/secrets/prompt_{nombre}.txt"]
    for p in cand:
        try:
            with open(p, encoding="utf-8") as f:
                t = f.read().strip()
                if t:
                    return t
        except Exception:
            pass
    return fallback


SYS_PET = _cargar_prompt("pet", SYS_PET_FALLBACK)
SYS_CARDIO = _cargar_prompt("cardio", SYS_CARDIO_FALLBACK)


def _fewshot(grupo, subtipo, excluir_id):
    """Construye 1-2 ejemplos (dictado -> informe) del mismo grupo/subtipo."""
    ej = []
    for e in estudios():
        if e["id"] == excluir_id:
            continue
        if e["tipo_grupo"] != grupo:
            continue
        if grupo == "pet" and subtipo and e.get("subtipo") != subtipo:
            continue
        if grupo == "cardio" and e.get("fase") != "esfuerzo":
            continue
        d, inf = e.get("dictado_ejemplo", ""), e.get("informe_prebaked", "")
        if d and inf:
            ej.append((d, inf))
        if len(ej) >= 2:
            break
    return ej


def _llamar_claude(system, mensajes, modelo):
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    r = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": key, "anthropic-version": "2023-06-01",
                 "content-type": "application/json"},
        json={"model": modelo, "max_tokens": 4000, "system": system, "messages": mensajes},
        timeout=180,
    )
    r.raise_for_status()
    blocks = r.json().get("content", [])
    return "".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip()


@app.route("/api/estructurar", methods=["POST"])
def api_estructurar():
    """Estructuración EN DIRECTO con Claude. Sin clave -> informe pre-cocinado."""
    p = request.get_json() or {}
    e = get_estudio(p.get("id"))
    if not e:
        return jsonify({"error": "no existe"}), 404
    dictado = (p.get("dictado") or "").strip()
    modelo = p.get("modelo") or DEMO_MODEL
    grupo = e["tipo_grupo"]
    prebaked = e.get("informe_prebaked", "")

    if not os.environ.get("ANTHROPIC_API_KEY") or not dictado:
        return jsonify({"informe": prebaked, "modo": "pre-cocinado"})
    if not _rate_ok("ia"):
        return jsonify({"informe": prebaked, "modo": "pre-cocinado (límite de la demo alcanzado)"})

    system = SYS_CARDIO if grupo == "cardio" else SYS_PET
    mensajes = []
    for d, inf in _fewshot(grupo, e.get("subtipo", ""), e["id"]):
        mensajes.append({"role": "user", "content": f"DICTADO:\n{d}"})
        mensajes.append({"role": "assistant", "content": inf})

    ctx = {"descripcion": e.get("descripcion"), "fecha": e.get("fecha"),
           "motivo": e.get("motivo_refinado") or e.get("motivo_raw")}
    if grupo == "cardio":
        ctx["protocolo_campos"] = e.get("protocolo_campos")
    contenido = (f"DATOS DEL ESTUDIO:\n{json.dumps(ctx, ensure_ascii=False, indent=2)}\n\n"
                 f"DICTADO:\n{dictado}")

    # estudios previos seleccionados para comparación evolutiva
    previos = p.get("previos") or []
    if previos:
        bloque = "\n\n".join(
            f"- {pv.get('fecha','')} · {pv.get('descripcion','')}\n  {pv.get('resumen','')}"
            for pv in previos)
        contenido += ("\n\nESTUDIOS PREVIOS PARA COMPARACIÓN (compara la evolución):\n" + bloque)
    mensajes.append({"role": "user", "content": contenido})

    try:
        inf = _llamar_claude(system, mensajes, modelo)
        if not inf:
            return jsonify({"informe": prebaked, "modo": "pre-cocinado"})
        return jsonify({"informe": inf, "modo": f"en-directo · {modelo}"})
    except Exception as ex:
        return jsonify({"informe": prebaked, "modo": f"pre-cocinado (API falló: {ex})"})


@app.route("/api/estado")
def api_estado():
    """Para que el front sepa qué capacidades 'en directo' hay."""
    return jsonify({
        "voz": bool(os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY")),
        "ia": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "modelo": DEMO_MODEL,
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5005))
    print(f"[Informes DEMO] http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
