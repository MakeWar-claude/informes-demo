# Historial de Pasos y Contexto del Proyecto

Este archivo registra el historial de instrucciones, decisiones de diseño y pasos realizados en el desarrollo del proyecto Informes_Demo.

## Contexto del Estado Actual
- **Última tarea completada**: Corregida la fórmula de extensión isquémica (carga por SDS) en los prompts LLM: `SDS/17 × 100` → `SDS/68 × 100` (68 = 17 segmentos × 4). Estaba ×4 inflada. Arreglado en `Informes` (`core/perf_estructurador.py`, `core/perf_ejemplos.py`) y `PerfusionMN` (`core/estructurador_spect.py`, `core/ejemplos_spect_corpus.py`). La calculadora JS de PerfusionMN (`static/app.js`) ya usaba `/68` (era la referencia correcta).
- **Estado del proyecto**: Cambios aplicados; ficheros Python compilan; cero `/17` vivos. No se tocaron los % de los ejemplos canónicos (ya coherentes con `/68`).
- **Punto de reanudación / Siguiente paso**: Probar generación en vivo de un informe de perfusión y verificar que el % de isquemia sale acorde a `/68`.

---


## Registro de Tareas e Instrucciones

### 2026-06-24 - Corrección fórmula de extensión isquémica (SDS/17 → SDS/68)
- **Instrucción del usuario**: "creo que en informes te has liado con el cálculo de la extensión isquémica. Lo que teníamos en perfusionMN en realidad estaba bien, compara, pregúntame y revertimos".
- **Diagnóstico**: El `%` de extensión isquémica NO se calcula en código en ningún sitio: se **instruye al modelo** en el prompt. Divergencia encontrada:
  - PerfusionMN — calculadora JS (`static/app.js`): `sds/68 × 100` ✅ (68 = 17 segmentos × 4 ptos máx; convención estándar de cardiología nuclear).
  - Prompts LLM (Informes `core/perf_estructurador.py` + `core/perf_ejemplos.py`; PerfusionMN `core/estructurador_spect.py` + `core/ejemplos_spect_corpus.py`): decían `SDS/17 × 100` ❌ → resultado ×4 inflado (SDS 7 daría 41% en vez del ~10% real). Lo confirman los ejemplos few-shot ("~5%", "~7%", "~12%"), que cuadran con `/68`.
- **Decisión (tras confirmar con el usuario, alcance "Informes + PerfusionMN")**: corregir solo la **instrucción de la fórmula** `/17 → /68`; NO tocar los % de los ejemplos canónicos (ya correctos).
- **Acciones**: 5 ediciones — `perf_estructurador.py:148,168`, `perf_ejemplos.py:32` (Informes); `estructurador_spect.py:178,198`, `ejemplos_spect_corpus.py:32` (PerfusionMN). Añadida aclaración "(68 = 17 segmentos × 4)" en las reglas.
- **Verificación**: `py_compile` OK en los 4 ficheros; `grep "SDS/17"` → ninguno vivo (solo queda la mención histórica en este history.md:207).
- **Estado actual**: Corregido y verificado. Pendiente prueba de generación en vivo.

### 2026-06-23 - Plantillas syngo.via por tipo de estudio (botón "Imágenes" en Informes)
- **Instrucción del usuario**: "el enlace imágenes para los estudios pet/CT en general [abre] con MM Oncology. Para los PET neurológicos y los DATSCAN quiero que abras MI Neurology, para el resto MI General. impleméntalo".
- **Diagnóstico**: La lógica vive en `template_para(code)` de [Informes/core/syngo_callup.py](file:///e:/Claude/windows/projects/Informes/core/syngo_callup.py) (proyecto real, NO en Informes_Demo). El botón "🖼️ Imágenes" (`btnAbrirImagenes` en `templates/index.html`) llama a `/api/syngo/abrir?...&code=<procedure_code>`, que pasa el código RIS a `abrir_estudio` → `template_para`, y este añade `-template <plantilla>` al `ialauncher.exe`. Antes: `if "PET" in code -> "MM Oncology"`, resto `None`. Códigos RIS relevantes (de `core/mn_modalidades.py`): `PET-CT-N` (PET cerebral), `MNDATSCAN` (DATscan), `MNPET-CT` (FDG oncológico), `MNPET-CT-I`/`PET-CT-M`/`PET-CT-H`.
- **Interpretación (3 buckets, conservando MM Oncology)**: PET neurológico + DATscan → "MI Neurology"; resto de PET/CT (oncológico, infección, miocarditis, Y-90) → "MM Oncology"; resto de estudios MN → "MI General".
- **Acciones realizadas**:
  - `template_para`: detecta `es_datscan` ("DATSCAN" in code), `es_neuro_pet` (PET + "PET-CT-N"/"CEREBR"/"NEURO"), `es_pet`. Devuelve MI Neurology / MM Oncology / MI General respectivamente. Nuevas constantes configurables por entorno: `SYNGO_TEMPLATE_NEURO`, `SYNGO_TEMPLATE_GENERAL` (+ la ya existente `SYNGO_TEMPLATE_PET`).
  - Actualizada la ayuda del bloque `__main__` del CLI.
- **Verificación**: `python -c` mapeando 12 códigos → todos correctos (`PET-CT-N`/`MNDATSCAN`→MI Neurology, `MNPET-CT`/`MNPET-CT-I`/`PET-CT-M/H`→MM Oncology, óseo/cardiaco/tiroides/vacío→MI General).
- **Estado actual**: Implementado y verificado por mapeo. Pendiente prueba end-to-end en la workstation de lectura con syngo.via abierto.

### 2026-06-23 - Propuesta de rediseño total de PerfusionMN
- **Instrucción del usuario**: "hazme una propuesta de rediseño total para perfusionMN en e:. curratelo, quieres el design award 2026"
- **Acciones realizadas**:
  - Se analizó la estructura del código frontend y backend en `e:\Claude\windows\projects\PerfusionMN` (`index.html`, `app.js`).
  - Se diseñó la propuesta y especificaciones técnicas en `implementation_plan.md` con la estética "Nebula Neo-Clinical", la arquitectura de doble panel (split layout), el árbol arterial SVG interactivo, y los mapas polares de alto contraste.
- **Estado actual**: Propuesta redactada como plan de implementación; esperando aprobación del usuario.

### 2026-06-23 - Diagnóstico definitivo y arreglo de Chrome en Antigravity IDE
- **Instrucción del usuario**: "sigue sin funcionar chrome con antigravity ide".
- **Diagnóstico (basado en el error REAL, no en suposiciones)**:
  - Log actual de la sesión (`Data/user-data/logs/.../main.log`): `[BrowserLauncherMain] No Chrome with CDP found on port 9222.` → `Chrome installation not found ... or set a custom Chrome binary path in the browser section of the Antigravity user settings.` El "failed to parse CDP port" de `ls-main.log`/`exthost.log` era el síntoma derivado.
  - Lectura del bundle del IDE (`app/resources/app/out/main.js`, `BrowserLauncherMain`): `_maybeLaunchBrowser` → `_isChromeWithRemoteDebuggingPortRunning()` ejecuta `curl -sf http://127.0.0.1:<port>/json/version` (timeout 500ms; `_getCdpPort()` def. 9222) y si responde se engancha; si no, `_findChromeInstallationPath()` lee `uss-browserPreferences.chromeBinaryPath` y, si está vacío, recorre rutas de instalación estándar. Chrome Portable no está en esas rutas → `ChromeInstallationError`.
  - **Conclusión**: las variables `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`/`PLAYWRIGHT_MCP_EXECUTABLE_PATH` configuradas en sesiones anteriores NO afectan a esta herramienta (son de Playwright). Por eso "seguía sin funcionar" pese a todos los reinicios.
- **Verificaciones**:
  - Chrome Portable existe y arranca con CDP (`chrome.exe` v149; `/json/version` OK en :9333 y :9222).
  - El endpoint CDP en loopback es accesible incluso con `HTTP_PROXY=127.0.0.1:8786` puesto, gracias a `NO_PROXY=127.0.0.1,localhost` (curl exit 0). Descartado que el shim/proxy rompa el CDP.
  - Perfil de Chrome del IDE (`%LOCALAPPDATA%`/`.gemini\antigravity-browser-profile`) limpio, sin locks.
- **Acciones realizadas**:
  - INMEDIATO: lanzado Chrome Portable en `:9222` con `--user-data-dir=%USERPROFILE%\.gemini\antigravity-browser-profile`; confirmado que el chequeo exacto del IDE devuelve exit 0 (se engancha).
  - PERMANENTE: creado [E:\Claude\windows\iniciar_chrome_antigravity.bat](file:///E:/Claude/windows/iniciar_chrome_antigravity.bat) — idempotente: si ya hay CDP en 9222 no relanza; si no, arranca Chrome Portable con puerto+perfil correctos y espera a que el puerto responda.
- **Pendiente / recomendado**: confirmar apertura desde la herramienta de navegador del IDE; alternativa permanente sin script: Ajustes de Antigravity → Browser → "Chrome binary path" = ruta de Chrome Portable. Opcional: retirar las `PLAYWRIGHT_*` de los `.bat`.

### 2026-06-23 - Arreglo DEFINITIVO: junction para que Antigravity lance Chrome aunque esté cerrado
- **Instrucción del usuario**: "abre solo si tengo chrome abierto, si esta cerrado da error".
- **Diagnóstico**: el atajo de enganche a un Chrome ya abierto en :9222 funcionaba, pero al cerrarlo el lanzador caía a `_findChromeInstallationPath()`, que sin `browserChromePath` configurado solo mira rutas de instalación estándar. Ese ajuste se guarda en `antigravityUnifiedStateSync.browserPreferences` (ApplicationStorage `state.vscdb`, sincronizado en la nube) → frágil de editar a mano con el IDE abierto y sin UI accesible.
- **Solución adoptada**: en vez de tocar el ajuste sincronizado, hacer que Chrome Portable aparezca en una de las rutas estándar que el IDE comprueba. Rutas (de `main.js`): `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`, `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`, `C:\Program Files\Chromium\Application\chrome.exe`.
  - Creada **junction de directorio** (sin admin): `%LOCALAPPDATA%\Google\Chrome\Application` → `E:\Claude\windows\GoogleChromePortable\App\Chrome` (incluye `chrome.exe` + carpeta de versión `149.0.7827.156` con las DLLs, por eso enlaza el directorio entero, no solo el .exe).
- **Verificaciones**: `…\Application\chrome.exe` resuelve y EJECUTA vía junction sirviendo CDP (probado en puerto aislado 9224 → `OK ejecuta via junction: Chrome/149`). Cerrado el Chrome de prueba de :9222 → ahora Antigravity lo relanzará solo al usar el navegador.
- **Limpieza**: revertido el pre-lanzado de Chrome que se había cableado en `antigravity_ide.bat` (ya no hace falta; abría una ventana en cada arranque). Se dejó en su lugar un comentario con el comando `mklink /J` para recrear la junction si se pierde (perfil de Windows nuevo). El `iniciar_chrome_antigravity.bat` queda como utilidad opcional de pre-arranque manual.
- **Estado actual**: Antigravity encuentra y lanza Chrome Portable por sí mismo aunque esté cerrado. Pendiente: que el usuario pruebe la herramienta de navegador con Chrome cerrado para confirmar.

### 2026-06-23 - Configuración de mapeos clínicos y compilación automática de ValidacionMN
- **Instrucción del usuario**: Resolver mapeos para Ventilación (13350) y Gammagrafía ósea localizada (13377) con formato "Gammagrafía vascular + ósea de (campo)", y solucionar por qué el paciente 183916 (vascular y ósea) es detectado como PET.
- **Acciones realizadas**:
  - Se modificó `build_catalogo.py` para mapear `13377` al slug `"osea_3fases"` con la plantilla administrativa `"Gammagrafía vascular + ósea de {v}"` y marcador de posición `"zona (p. ej. tibia derecha)"`.
  - Se confirmó que Ventilación (13350, 13501, 13352) apunta al protocolo de Technegas/pertecnetato inhalado.
  - Se implementó la compilación automatizada al final de `build_catalogo.py`, la cual inyecta el catálogo plano (`CATALOGO`) y las exclusiones (`EXCLUIDOS_IDS`) en `validacion_mn.template.js` y genera:
    1. `userscript/validacion_mn.user.js` (Tampermonkey)
    2. `extension/content/validacion_mn.js` (Local unpacked en E:)
    3. `S:\Jorge\ClaudeCode\projects\ValidacionMN\extension\content\validacion_mn.js` (Sync en S:)
    4. `S:\ExtensionEdge_Validaciones\content\validacion_mn.js` (Sync en S:)
  - Se copió la carpeta completa de la extensión desempaquetada a la ruta de red `S:\ExtensionEdge_Validaciones`.
  - Se desarrolló un script de copiado automático para refrescar los archivos `.js` de la extensión unpacked directamente en el directorio activo de Edge en `%LOCALAPPDATA%\ValidacionMN-ext\content\`.
  - **Diagnóstico del solapamiento con PET**: El NHC `183916` presentaba el código `13377`, el cual no estaba en el catálogo del script `ValidacionMN` de producción. Por ende, la validación de MN no reclamaba la petición, dejando que el script de PET se activase al encontrar textareas. Al incorporar `13377` en el catálogo MN, este activa `window.__vmnOwns = true`, silenciando al script de PET e iniciando el de MN correctamente.
- **Estado actual**: Todo compilado, sincronizado, copiado en Edge y respaldado en S:\ExtensionEdge_Validaciones. Listo para prueba en vivo.


### 2026-06-23 - Corrección de espaciados en etiquetas de ValidacionPET
- **Instrucción del usuario**: "puedes mejorar el texto de Comité, que no deja espacio entre comité y el paréntesis. De resto en general esta bien"
- **Acciones realizadas**:
  - Se analizó el layout CSS en `S:\Jorge\ClaudeCode\projects\ValidacionPET\userscript\validacion_pet.user.js`.
  - Debido a la estructura flexbox (`display: flex`) en `#vpet-panel .vpet-row`, los espacios en nodos de texto adyacentes a etiquetas `<b>` se colapsaban visualmente en algunos navegadores.
  - Se añadió la propiedad `gap: 8px` al estilo `.vpet-row` para dar separación uniforme a los controles.
  - Se envolvieron las etiquetas de texto de los inputs en elementos `<span>` para forzar un flujo inline clásico y preservar correctamente los espacios internos (por ejemplo, el espacio entre `<b>Comité</b>` y el paréntesis `(añade...)`).
- **Estado actual**: Espaciados corregidos y aplicados en el script de producción.


### 2026-06-23 - Generación de mockup visual de la ventana de ValidacionPET
- **Instrucción del usuario**: "ahora no puedo abrir drago, me enseñas un mockup?"
- **Acciones realizadas**:
  - Se utilizó la herramienta de generación de imágenes (`generate_image`) para crear un mockup de alta fidelidad que muestra el nuevo panel de validación flotante y el botón flotante (FAB) con su estética "Ethereal Clinical Premium".
  - Se incrustó el mockup generado directamente en el archivo [walkthrough.md](file:///C:/Users/jmirramv/.gemini/antigravity-ide/brain/5b815a11-9063-4ec8-aaf5-baa20e14e43d/walkthrough.md).
- **Estado actual**: Mockup presentado visualmente al usuario.


### 2026-06-23 - Rediseño premium de la ventana de ValidacionPET (implementado)
- **Instrucción del usuario**: Solicitud de un diseño más bonito, moderno, ligero y elegante para el script inyectado en Edge para validar PETs en Drago.
- **Acciones realizadas**:
  - Se localizó el userscript `S:\Jorge\ClaudeCode\projects\ValidacionPET\userscript\validacion_pet.user.js` que maneja la interfaz flotante.
  - Se desarrolló la propuesta de diseño "Ethereal Clinical Premium" en `implementation_plan.md` aplicando glassmorphism (`backdrop-filter: blur(16px)`), degradados de azul médico, y animaciones de entrada.
  - Tras la aprobación automática de la propuesta, se inyectaron los nuevos estilos CSS y la estructura HTML del botón flotante (FAB en formato de cápsula redondeada con tirador `⋮⋮` y zoom reactivo) y del panel en el script original de producción.
- **Estado actual**: Rediseño finalizado e inyectado. Listo para recargar en Tampermonkey y probar en Edge.



### 2026-06-23 - Cálculo de porcentaje de cuota consumida de Gemini
- **Instrucción del usuario**: "quiero saber porcentaje del limite"
- **Acciones realizadas**:
  - Se contrastaron las 533 llamadas realizadas hoy con las cuotas estándar de Google AI Studio / Gemini API (1500 peticiones al día para el tier gratuito de Gemini Flash).
  - Se calculó el porcentaje de uso diario consumido: **35.53%** (de 1500 RPD), **53.3%** (si el límite fuese 1000 RPD) o **26.65%** (si el límite fuese 2000 RPD).
- **Estado actual**: Porcentaje presentado al usuario de forma detallada.


### 2026-06-23 - Consulta de uso de Gemini del usuario (esta mañana)
- **Instrucción del usuario**: "me muestras mi uso de gemini esta mañana para saber cuanta carga llevo?"
- **Acciones realizadas**:
  - Se desarrolló y ejecutó un script en Python (`summary_usage_v2.py`) para escanear las bases de datos SQLite de conversación en `.gemini/antigravity-ide/conversations`, `.gemini/antigravity-cli/conversations` y `.gemini/antigravity/conversations`.
  - Se filtraron las sesiones con actividad el día de hoy (2026-06-23).
  - Se contabilizó un total de **533 invocaciones a Gemini (LLM)** distribuidas en 11 sesiones activas (IDE y CLI), con un total de 58 turnos de usuario.
- **Estado actual**: Reporte del uso de Gemini presentado al usuario.

### 2026-06-23 - Integración syngo.via: abrir estudios en la instancia ya abierta (Image Call-Up)
- **Instrucción del usuario**: Investigar syngo.via y generar enlaces que abran un estudio en el syngo.via YA abierto (o lo arranquen si no lo está), evitando la ventana nueva que crea el RIS. A futuro se integrará en Informes. Datos: servidor de aplicaciones `10.136.61.220`, versión `VB60S`.
- **Investigación en el equipo**:
  - syngo.via VB60S instalado en `C:\Program Files\Siemens\syngo.via\bin`; cliente corriendo (`syngo.Common.Container.exe` con `Basic_Client_1_2`).
  - Mecanismo correcto = **Image Call-Up** vía **`ialauncher.exe`** (v8.15.2402.1701). Es un lanzador fino que habla por IPC con el vortal/contenedor ya en marcha (instancia fija `ExternalImageCallup`, ver `ialauncher.exe.config`, `MaxNumberOfRunningVortals=8`) → **reutiliza la ventana abierta**; si no hay, la arranca.
  - Parámetros clave extraídos del binario: `-a <Accession>`, `-pid <PatientID>`, `-s1 <StudyUID>`, `-s2 <SeriesUID>`, `-append`, `-server <IP>`, `-type READ|VIEW|DEFINE_WORKFLOW`, `-lwwc/-lwsc`, `-monitors`.
  - El endpoint web IHE IID NO está publicado en el servidor (`https://10.136.61.220/IHEInvokeImageDisplay` → 404); en VB60 la vía del cliente pesado es `ialauncher.exe`, no una URL HTTP.
- **Acciones realizadas** (carpeta nueva `syngovia/`):
  - `abrir_syngovia.vbs`: parsea URIs `syngovia:a|pid|study|series/<valor>` y llama a `ialauncher.exe` (oculto) con el flag correcto + `-server 10.136.61.220`.
  - `registrar_protocolo.ps1` / `desregistrar_protocolo.ps1`: registran/eliminan el protocolo de URL `syngovia:` en HKCU (sin admin). **Ejecutado el registro** (queda activo en este usuario).
  - `test_parse.vbs`: verificación segura (muestra el comando sin ejecutar nada). Probados 5 casos OK.
  - `README.md`: documentación completa + snippet JS (`window.location.href = 'syngovia:a/'+accession`) para integrar en Informes.
- **Estado actual**: Protocolo `syngovia:` registrado y parseo verificado. **Pendiente**: prueba end-to-end con una petición REAL (carga PHI en el cliente clínico, la deja el usuario) y, en su momento, cablear el botón en Informes.

### 2026-06-23 - Botón "Imágenes" en Informes (abrir estudio en syngo.via)
- **Instrucción del usuario**: Aclaración: no quería una app aparte, sino que al dictar un paciente en Informes haya un botón "Imágenes" que lleve al estudio en syngo.via.
- **Acciones realizadas**:
  - [static/app.js](file:///e:/Claude/windows/projects/Informes_Demo/static/app.js): nueva función `abrirEnSyngoVia(idPaciente)` que hace `window.location.href = "syngovia:pid/"+id`; y botón "🖼️ Imágenes" añadido en `cabecera()` (lo usan las 3 vistas: PET, anamnesis, cardio-esfuerzo). Demo abre por NHC (Patient ID, `-pid`); en real bastaría cambiar a `syngovia:a/<accession>`.
  - [static/index.html](file:///e:/Claude/windows/projects/Informes_Demo/static/index.html): estilo `.btn-imagenes` (degradado violeta-azul).
  - Explicado al usuario que el "puente" (protocolo `syngovia:` + ialauncher) es imprescindible porque el navegador no puede arrancar un .exe directamente; el botón en la web es la otra mitad.
- **Verificación**: `node --check` OK; demo levantada en :5061 y comprobado que sirve `abrirEnSyngoVia`, `syngovia:pid` y `.btn-imagenes`.
- **Estado actual**: Botón funcional y cableado. Para que abra de verdad: tener el protocolo registrado (ya hecho en este PC) y usar un identificador que exista en syngo.via.

### 2026-06-23 - Botón "Imágenes" preferir nº de petición (accession)
- **Instrucción del usuario**: "sería ideal, sí" → preparar el botón para abrir por nº de petición (accession) en vez de NHC.
- **Acciones realizadas**:
  - [static/app.js](file:///e:/Claude/windows/projects/Informes_Demo/static/app.js): `abrirEnSyngoVia(accession, nhc)` ahora prioriza `syngovia:a/<accession>` (estudio exacto) y cae a `syngovia:pid/<nhc>` si no hay accession. Botón pasa `e.accession` y `e.paciente.nhc`.
  - [data/estudios_demo.json](file:///e:/Claude/windows/projects/Informes_Demo/data/estudios_demo.json): añadido campo `accession` a los 30 estudios (formato AAAAMMDD+id, ej. `20260618001`). `app.py` lo devuelve tal cual en `/api/estudio/<id>`.
- **Verificación**: demo en :5062 → API devuelve `accession`, JS usa `syngovia:a/` y pasa `e.accession`. node --check OK.
- **Estado actual**: Botón abre por nº de petición. Listo para producción: mapear el accession real del RIS al campo `accession` del estudio.



### 2026-06-23 - Prueba de apertura de Chrome y validación de estado
- **Instrucción del usuario**: "prueba ahora a abrir chrome"
- **Acciones realizadas**:
  - Se arrancó el servidor Flask de la demo en el puerto `5057` (`$env:PORT="5057"; E:\Claude\windows\python\python.exe app.py`).
  - Se ejecutó el subagente de navegación en Chrome para acceder a `http://127.0.0.1:5057`.
  - El subagente falló de forma consistente al crear el contexto del navegador (`failed to parse CDP port`).
- **Estado actual**: Servidor en ejecución local. Navegador no inicializa por falta de reinicio del proceso del IDE.


### 2026-06-23 - Rediseño visual y pulido CSS a "Ethereal Clinical Premium"
- **Instrucción del usuario**: Chequear y pulir el CSS de la aplicación Informes_Demo.
- **Acciones realizadas**:
  - Se importó la tipografía premium **Outfit** de Google Fonts en el `<style>` de [static/index.html](file:///e:/Claude/windows/projects/Informes_Demo/static/index.html).
  - Se modificó la paleta de colores y el degradado de fondo del body.
  - Se rediseñaron los componentes `.panel` y `.clinical-card` dándoles un acabado translúcido (Glassmorphism con `backdrop-filter: blur(16px)` y bordes semitransparentes).
  - Se añadieron micro-animaciones de entrada suave para la carga de vistas (`pageFadeIn`) y de pulsación/brillo sutil en el logo principal (`logoPulse`).
  - Se estilizaron botones, campos de entrada, toggles y las tablas de pendientes para darles un aspecto moderno de nivel empresarial.
  - Se levantó el servidor de la demo en segundo plano en el puerto `5057` para pruebas en local (`python app.py` con `PORT=5057`).
- **Estado actual**: CSS pulido y servidor corriendo en :5057.

### 2026-06-23 - Habilitar bypass de permisos por defecto para el agente Antigravity (Gemini)
- **Instrucción del usuario**: Configurar para el agente de Antigravity (Gemini) la misma omisión de permisos que para Claude Code.
- **Acciones realizadas**:
  - Se localizó el archivo de configuración global del agente Antigravity en `C:\Users\jmirramv\.gemini\config\config.json`.
  - Se modificó la lista `"allow"` dentro de `"globalPermissionGrants"` de `config.json` para inyectar comodines globales: `"command(*)"`, `"read_file(*)"`, `"write_file(*)"`, `"mcp(*)"`, `"execute_url(*)"`, `"read_url(*)"`, y `"unsandboxed(*)"`.
- **Estado actual**: Permisos globales autorizados para el agente Antigravity de manera permanente.
### 2026-06-23 - Antigravity IDE apunta a Chrome Portable (en vez del Chromium nativo de Playwright)
- **Instrucción del usuario**: "Haz que Antigravity IDE VEA mi Chrome Portable y sea capaz de ejecutarlo."
- **Diagnóstico**: La configuración previa apuntaba las variables de Playwright al Chromium nativo descargado (`.cache\ms-playwright\chromium-1228\chrome-win64\chrome.exe`). El usuario quiere usar su propio Chrome Portable. Se verificó que `E:\Claude\windows\GoogleChromePortable\App\Chrome\chrome.exe` existe (v149.0.7827.156) y arranca con CDP correctamente (`chrome_output.txt` muestra DevTools en :9222).
- **Acciones realizadas**:
  - En [E:\Claude\windows\antigravity-ide-stable\antigravity_ide.bat](file:///E:/Claude/windows/antigravity-ide-stable/antigravity_ide.bat): `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` y `PLAYWRIGHT_MCP_EXECUTABLE_PATH` → `%ROOT_DIR%\GoogleChromePortable\App\Chrome\chrome.exe` (ruta portable, sin letra de unidad fija).
  - En [E:\Claude\windows\START.bat](file:///E:/Claude/windows/START.bat): mismas variables → `%HERE%GoogleChromePortable\App\Chrome\chrome.exe`.
- **Pendiente**: El usuario debe reiniciar el IDE (cerrarlo y relanzar `antigravity_ide.bat`) para heredar las nuevas variables de entorno en el proceso raíz.
- **Estado actual**: Variables redirigidas a Chrome Portable. Requiere reinicio del IDE.

### 2026-06-23 - Configuración dinámica y portable de Chrome Portable en Antigravity IDE
- **Instrucción del usuario**: Resolver por qué Chrome Portable en el Tuff nano sigue sin funcionar para Antigravity IDE.
- **Diagnóstico**: 
  - La propiedad `terminal.integrated.env.windows` en `settings.json` solo inyectaba la variable en terminales integradas de VS Code, pero no al proceso raíz `Antigravity IDE.exe` que Playwright utiliza para levantar los browser subagents, causando el fallo de inicialización del puerto CDP.
  - La variable configurada era rígida (`E:\...`), rompiéndose si el disco externo Tuff nano cambiaba de letra de unidad.
- **Acciones realizadas**:
  - Se modificó [E:\Claude\windows\antigravity-ide-stable\antigravity_ide.bat](file:///E:/Claude/windows/antigravity-ide-stable/antigravity_ide.bat) inyectando dinámicamente `set "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=%~dp0..\GoogleChromePortable\App\Chrome\chrome.exe"`.
  - Se modificó [E:\Claude\windows\START.bat](file:///E:/Claude/windows/START.bat) de la misma forma para consolas interactivas del entorno portable: `set "PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=%HERE%GoogleChromePortable\App\Chrome\chrome.exe"`.
  - Se eliminó la entrada `terminal.integrated.env.windows` en [E:\Claude\windows\antigravity-ide-stable\Data\user-data\User\settings.json](file:///E:/Claude/windows/antigravity-ide-stable/Data/user-data/User/settings.json) para evitar que se sobrescriban las variables dinámicas del proceso padre con rutas absolutas rígidas.
- **Estado actual**: Configuración portable y dinámica completada. Requiere reinicio del IDE.

### 2026-06-23 - Porte del rediseño de perfusión miocárdica a la demo
- **Instrucción del usuario**: Modificar la demo (Informes_Demo) con los cambios hechos en `Informes` en la parte de perfusión miocárdica.
- **Contexto**: En `Informes` (`templates/index.html`) se rediseñó el módulo de anamnesis `#perfAnamnesis` con clinical-cards, toggles azules (antes rojos) y árbol de vasos DA/CX/CD. La demo es una SPA read-only distinta (`static/index.html` + `static/app.js`) con datos ficticios.
- **Acciones realizadas**:
  - Se añadió al `<style>` de [static/index.html](file:///e:/Claude/windows/projects/Informes_Demo/static/index.html) el sistema de clases del rediseño: `.clinical-card` (+`:hover`, `h3` azul), `.form-grid-2/3/4`, `.sub-card`, `.arterias-grid`, `.arteria-card`, `.rama-label` (conector `└`) y `.btn-group`/`.bg-item.activo` con azul médico (`var(--primary)`).
  - Se reescribió `renderAnamnesis` en [static/app.js](file:///e:/Claude/windows/projects/Informes_Demo/static/app.js) (cardio reposo) usando clinical-cards y la organización de la app real: Datos administrativos+demografía (con toggles read-only de régimen/protocolo), Antecedentes EAC y conducción (árbol de vasos `rama-label` cuando es EAC conocida), Sintomatología y FRCV en dos sub-cards, y Tratamiento.
  - Se actualizó `renderCardioEsfuerzo` para usar clinical-cards (Constantes/cuantificación, Impresión visual, Informe generado) y se añadió un toggle de protocolo azul de solo lectura, **preservando todos los IDs funcionales** (`pc_*`, `btnGrabar`, `btnDictarCampos`, `informe`, etc.).
  - Verificado: `node --check static/app.js` OK; la demo arranca y sirve `index.html`/`app.js`/`/api/estudios` con HTTP 200.
- **Estado actual**: Rediseño portado y funcional; pendiente revisión visual del usuario.

### 2026-06-23 - Informe de perfusión "como si lo hubiera escrito Jorge" + cabecera sin IA
- **Instrucción del usuario**: "lo que quiero es que el informe salga como si lo hubiera escrito yo" y "quítame de la cabecera lo de la IA".
- **Diagnóstico**: La demo generaba/mostraba informes cardio con desviaciones del canon real (SDS inline en la cuantificación, conclusiones tipo "Isquemia moderada y reversible…", "carga isquémica del 35%" con la fórmula SDS/17×100). El motor real (`core/perf_estructurador.py`) consigue el estilo de Jorge inyectando `SYSTEM_SPECT` + 14 ejemplos few-shot reales (`core/perf_ejemplos.py`).
- **Acciones realizadas**:
  - Script puntual (eliminado tras usarse) que reutilizó `SYSTEM_SPECT`, `EJEMPLOS` y `_formatear_entrada` reales y, mapeando `protocolo_campos`→contexto, regeneró vía API directa (Opus 4.7) los 4 informes pre-cocinados cardio (ids 17/19/21/23) preservando hallazgos y cifras. Datos ficticios → sin problema de privacidad. Pegados en `data/estudios_demo.json` (`informe_prebaked`).
  - Cabecera: eliminado el `<span id="estado">` (indicador IA/voz) de [static/index.html](file:///e:/Claude/windows/projects/Informes_Demo/static/index.html); `btnReset` con `margin-left:auto`. `pintarEstado()` en [static/app.js](file:///e:/Claude/windows/projects/Informes_Demo/static/app.js) ahora hace guard si los elementos no existen (no rompe).
  - Verificado en :5057: id17 con "porcentaje de isquemia de aprox. 6%", sin "(SDS de …)", acentos UTF-8 correctos, header sin `#estado`.
- **Decisión técnica**: regenerar con el motor real (no editar a mano) para no introducir juicio clínico propio; el few-shot del modo en directo (`_fewshot` en `app.py`) lee de los prebaked, así que al volverlos canónicos también mejora la generación en vivo.
- **Estado actual**: Informes de perfusión con estilo auténtico de Jorge tanto en pre-cocinado como en few-shot del modo en directo; cabecera limpia.

### 2026-06-23 - Inicialización del Historial
- **Instrucción del usuario**: Configurar e inicializar el historial persistente de pasos para todos los proyectos en E:.
- **Acciones realizadas**:
  - Se configuró la carpeta `.agents` y el archivo de reglas [AGENTS.md](file:///e:/Claude/windows/projects/Informes_Demo/.agents/AGENTS.md).
  - Se creó este archivo de historial [history.md](file:///e:/Claude/windows/projects/Informes_Demo/.agents/history.md).
- **Estado actual**: Historial iniciado y listo para registrar futuras interacciones.

### 2026-06-23 - Migración a Chromium nativo de Playwright y bypass de loopback en ClaudeBridge
- **Instrucción del usuario**: Solucionar el corte inesperado y terminar de arreglar el acceso del navegador (Chrome) en el subagente de navegación.
- **Diagnóstico**:
  - El error `failed to parse CDP port` del subagente persistía porque el proxy local `agy_oauth_shim.py` (puerto 8786) interceptaba las conexiones CDP locales y las redirigía a través de la VDI upstream (`TUNNEL` :8785) en lugar de conectarse directamente en local.
  - Además, Chrome Portable puede presentar problemas de compatibilidad y perfiles con el protocolo de depuración remota de Playwright.
- **Acciones realizadas**:
  - Se modificó [S:\Jorge\ClaudeCode\projects\ClaudeBridge\agy_oauth_shim.py](file:///S:/Jorge/ClaudeCode/projects/ClaudeBridge/agy_oauth_shim.py) para omitir el túnel y conectar localmente si el host es `127.0.0.1`, `localhost` o `::1`.
  - Se reinició el proxy `agy_oauth_shim.py` en el puerto 8786.
  - Se instaló de forma local y portable el Chromium oficial y nativo de Playwright (`chromium-1228`) en [E:\Claude\windows\.cache\ms-playwright](file:///e:/Claude/windows/.cache/ms-playwright) usando `npx playwright install chromium` vía CMD.
  - Se modificaron [E:\Claude\windows\antigravity-ide-stable\antigravity_ide.bat](file:///E:/Claude/windows/antigravity-ide-stable/antigravity_ide.bat) y [E:\Claude\windows\START.bat](file:///E:/Claude/windows/START.bat) para apuntar las variables `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` y `PLAYWRIGHT_MCP_EXECUTABLE_PATH` al nuevo binario nativo de Chromium en la ruta portable `.cache\ms-playwright`.
- **Estado actual**: Servidor demo activo en :5057. Configuración portable del navegador nativo de Playwright finalizada. Requiere reinicio del IDE por el usuario para aplicar las variables de entorno heredadas.
