# Abrir estudios en syngo.via desde Informes (Image Call-Up)

## Qué resuelve
El RIS abre **una ventana nueva** de syngo.via cada vez. Esto, en cambio, carga el
estudio en el **syngo.via ya abierto** (y si no hay ninguno, lo arranca). Es el
comportamiento "abrir en la instancia abierta o abrir si no estaba" que pediste.

## Cómo funciona (lo investigado en este PC)
- syngo.via **VB60S** está instalado en `C:\Program Files\Siemens\syngo.via\bin`.
- El mecanismo oficial Siemens para abrir estudios es **Image Call-Up**, vía el
  ejecutable **`ialauncher.exe`**.
- `ialauncher.exe` **no es el cliente**: es un lanzador fino que habla por IPC con
  el contenedor/vortal ya en marcha (instancia fija `ExternalImageCallup`, ver
  `ialauncher.exe.config`). Por eso **reutiliza la ventana abierta** en vez de crear
  una nueva. Si no hay vortal, lo arranca.
- El endpoint web IHE IID **no** está publicado en el servidor de aplicaciones
  (`https://10.136.61.220/IHEInvokeImageDisplay` → 404), así que en VB60 la vía
  correcta para el cliente pesado es `ialauncher.exe`, no una URL HTTP.

### Parámetros de ialauncher.exe (extraídos del binario)
| Parámetro | Carga por | DICOM |
|---|---|---|
| `-a <AccessionNumber>` | Nº de petición | (0008,0050) |
| `-pid <PatientID>` | ID de paciente | (0010,0020) |
| `-s1 <StudyInstanceUID>` | Study UID | (0020,000D) |
| `-s2 <SeriesInstanceUID>` | Series UID | (0020,000E) |
| `-append` | Añade al taskflow abierto (mismo paciente) | |
| `-server <IP>` / `-server:find` | Servidor de aplicaciones | |
| `-type READ\|VIEW\|DEFINE_WORKFLOW` | Tipo de workflow (READ por defecto) | |
| `-lwwc` / `-lwsc` | Login con credenciales Windows / guardadas | |
| `-monitors <Displays>` | Monitor destino | |

## Instalación (una vez por puesto)
```powershell
# en esta carpeta:
powershell -ExecutionPolicy Bypass -File .\registrar_protocolo.ps1
```
Registra el protocolo `syngovia:` en HKCU (sin admin). Para quitarlo:
```powershell
powershell -ExecutionPolicy Bypass -File .\desregistrar_protocolo.ps1
```

## Esquema de URI
```
syngovia:a/<accession>        abrir por nº de petición   (recomendado desde un informe)
syngovia:pid/<patientID>      abrir por paciente
syngovia:study/<StudyUID>     abrir por Study Instance UID
syngovia:series/<SeriesUID>   abrir por Series Instance UID
syngovia:<accession>          atajo: se trata como accession
```

## Integración en Informes (cuando lo quieras conectar)
Como es un protocolo de URL, basta un enlace/botón. No necesita backend:

```html
<button id="btnSyngo">Abrir en syngo.via</button>
<script>
  function abrirEnSyngoVia(accession) {
    // reutiliza el syngo.via abierto; si no, lo abre
    window.location.href = 'syngovia:a/' + encodeURIComponent(accession);
  }
  document.getElementById('btnSyngo')
          .addEventListener('click', () => abrirEnSyngoVia(ACCESSION_DEL_INFORME));
</script>
```

## Prueba directa (sin navegador)
Con una petición real, desde PowerShell/cmd:
```bat
"C:\Program Files\Siemens\syngo.via\bin\ialauncher.exe" -a 123456 -server 10.136.61.220
```
o, ya con el protocolo registrado:
```bat
start syngovia:a/123456
```

## Notas
- **PHI / sesión clínica:** cada llamada carga un paciente real en el syngo.via
  abierto. Probar con una petición conocida y en un momento adecuado.
- Si al arrancar en frío pide login, descomenta/añade `-lwwc` (SSO Windows) en
  `abrir_syngovia.vbs`.
- Si la ruta de instalación o la IP cambian, edita las constantes al principio de
  `abrir_syngovia.vbs`.
