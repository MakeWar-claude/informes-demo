# Informes — DEMO web pública

Demo navegable (datos 100 % inventados) de la app de dictado guiado de informes
de Medicina Nuclear. Pensada para enseñarla por enlace a un tercero.

## Qué muestra

- **Cola global (Pendientes)** con 30 estudios ficticios: 15 PET/CT, 8 cardio
  (4 pacientes × reposo+esfuerzo) y 7 de MN convencional.
- **Asignación**: el visitante se asigna un estudio y lo informa.
- **PET/CT y MN**: ficha del paciente + previos comparables + **motivo** (RIS) y
  **refinado por IA** (ambos pre-cocinados) + **dictado** (voz online) +
  **estructuración del informe** (Claude en directo).
- **Cardio reposo** → botón **Anamnesis**: hoja de anamnesis pre-rellenada
  (factores de riesgo, EAC, síntomas, tratamiento), como en PerfusionMN.
- **Cardio esfuerzo** → botón **Dictar**: **campos del protocolo** dictables
  (FEVI, VTD/VTS, SSS/SRS/SDS, TID, FC/TA, METs/Bruce/ECG…) + impresión visual
  dictada + generación del informe de perfusión miocárdica.

## Qué es "en directo" y qué está pre-cocinado

| Función | Modo |
|---|---|
| Motivo (indicación cruda) | pre-cocinado (dataset) |
| Refinado del motivo por IA | pre-cocinado (se muestra como IA, sin llamada) |
| Transcripción de voz (Whisper) | **en directo** si hay clave; si no, "dictado de ejemplo" |
| Estructuración del informe (Claude) | **en directo** si hay clave; si no, informe pre-cocinado |

Sin ninguna clave la demo funciona entera en modo pre-cocinado (nunca se rompe).

## Ejecutar en local

```bash
pip install -r requirements.txt
# opcional: claves para activar lo "en directo"
set ANTHROPIC_API_KEY=sk-ant-...     # Windows (PowerShell: $env:ANTHROPIC_API_KEY="...")
set GROQ_API_KEY=gsk_...
python app.py
# http://127.0.0.1:5005
```

## Whisper online — sí, se puede

La app real usa `faster-whisper` **local** (en el Tuff nano, con GPU). Para una
demo en la nube no hay GPU, así que la transcripción se delega a un servicio:

- **Groq** (recomendado): `whisper-large-v3-turbo`, rapidísimo y casi gratis.
  Solo `GROQ_API_KEY`. El navegador graba (webm/opus) y el backend reenvía el
  audio a Groq. No hay que convertir nada.
- **OpenAI** (`whisper-1`): alternativa, con `OPENAI_API_KEY`.

> La clave **nunca** va al navegador: vive en el servidor y este hace de proxy.
> Por eso la demo necesita un backend (ver abajo) y no vale un alojamiento solo
> de ficheros.

## Hosting — Google Drive NO sirve

Google Drive (y Dropbox, etc.) solo sirven **ficheros estáticos** y, de hecho,
retiró el alojamiento web en 2016. Esta demo necesita un **backend** que guarde
las claves de API y haga de proxy a Claude y a Whisper, así que **no** puede ir
en Drive. Opciones baratas/gratis donde sí corre tal cual:

- **Render.com** (free): conecta el repo, build `pip install -r requirements.txt`,
  start `gunicorn app:app`. Variables de entorno en el panel. (Se duerme tras
  inactividad; suficiente para una demo.)
- **Railway / Fly.io**: similar, plan gratuito o ~5 $/mes.
- **PythonAnywhere**: plan gratis para apps Flask pequeñas.
- **VPS de 4-5 €/mes** (Hetzner, Contabo): control total; `gunicorn` + nginx.

Comando de arranque en producción:

```bash
gunicorn -w 2 -b 0.0.0.0:$PORT app:app
```

### Coste aproximado de la demo "en directo"

- Whisper (Groq): céntimos por hora de audio.
- Claude: con `claude-sonnet-4-6` por defecto, cada informe son fracciones de
  céntimo. Para abaratar al máximo: `DEMO_MODEL=claude-haiku-4-5-20251001`.
  Si te preocupa el abuso público, deja la IA en modo pre-cocinado (sin
  `ANTHROPIC_API_KEY`) y activa solo la voz.

## Estructura

```
Informes_Demo/
  app.py                  # Flask: sirve la web + proxys voz/IA
  requirements.txt
  .env.example
  data/estudios_demo.json # 30 estudios ficticios (con todo lo pre-cocinado)
  static/index.html       # SPA (diseño "Ethereal Clinical" de la app real)
  static/app.js           # lógica de cliente
```

## Notas

- Los datos son inventados; la app real pseudonimiza antes de cualquier llamada
  externa. En la demo se omite porque no hay datos reales.
- El estado del visitante (asignaciones, informes guardados) vive en su
  `localStorage`: cada visitante tiene su propia sesión y no pisa a otros.
