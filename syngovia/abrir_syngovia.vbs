' ============================================================================
'  abrir_syngovia.vbs
'  Abre un estudio en syngo.via REUTILIZANDO la instancia ya abierta.
'
'  Usa ialauncher.exe (el "Image Call-Up" de syngo.via VB60). ialauncher
'  habla por IPC con el vortal/contenedor ya en marcha ("ExternalImageCallup"),
'  asi que NO abre una ventana nueva: carga el estudio en el syngo.via abierto.
'  Si syngo.via no esta abierto, ialauncher lo arranca y luego carga el estudio.
'
'  Se invoca desde el protocolo de URL  syngovia:  (ver registrar_protocolo.ps1)
'  Formatos de URI admitidos (el navegador pasa todo como un unico argumento):
'     syngovia:a/<AccessionNumber>        -> ialauncher -a   (DICOM 0008,0050)
'     syngovia:pid/<PatientID>            -> ialauncher -pid (DICOM 0010,0020)
'     syngovia:study/<StudyInstanceUID>   -> ialauncher -s1  (DICOM 0020,000D)
'     syngovia:series/<SeriesInstanceUID> -> ialauncher -s2  (DICOM 0020,000E)
'     syngovia:<AccessionNumber>          -> por defecto se trata como accession
' ============================================================================
Option Explicit

' --- Configuracion (ajustar si cambia la ruta o el servidor) -----------------
Dim IALAUNCHER, SERVER
IALAUNCHER = "C:\Program Files\Siemens\syngo.via\bin\ialauncher.exe"
SERVER     = "10.136.61.220"   ' servidor de aplicaciones syngo.via (VB60S)
' -----------------------------------------------------------------------------

Dim uri, kind, value, flag, p, cmd, sh

If WScript.Arguments.Count = 0 Then WScript.Quit 1
uri = WScript.Arguments(0)

' Quitar el esquema "syngovia:" y barras sobrantes
If InStr(1, uri, "syngovia:", vbTextCompare) = 1 Then
  uri = Mid(uri, Len("syngovia:") + 1)
End If
Do While Left(uri, 1) = "/"
  uri = Mid(uri, 2)
Loop
If Len(uri) > 0 And Right(uri, 1) = "/" Then uri = Left(uri, Len(uri) - 1)

' Separar tipo / valor
p = InStr(uri, "/")
If p > 0 Then
  kind  = LCase(Left(uri, p - 1))
  value = Mid(uri, p + 1)
Else
  kind  = "a"        ' sin prefijo => accession
  value = uri
End If

value = URLDecode(value)
If Len(value) = 0 Then WScript.Quit 2

Select Case kind
  Case "a", "acc", "accession" : flag = "-a"
  Case "pid", "patient"        : flag = "-pid"
  Case "study", "s1", "uid"    : flag = "-s1"
  Case "series", "s2"          : flag = "-s2"
  Case Else                    : flag = "-a"
End Select

' Llamada al launcher. -server fija el servidor de aplicaciones.
' (Si el sitio usa SSO de Windows y al arrancar en frio pide login, anadir  -lwwc )
cmd = """" & IALAUNCHER & """ " & flag & " """ & value & """ -server " & SERVER

Set sh = CreateObject("WScript.Shell")
' 0 = la ventana del PROPIO launcher va oculta; el visor de syngo.via se muestra solo.
sh.Run cmd, 0, False
WScript.Quit 0

' --- util: decodifica %xx y + por si la URI llega url-encoded -----------------
Function URLDecode(s)
  Dim i, c, r
  r = "" : i = 1
  Do While i <= Len(s)
    c = Mid(s, i, 1)
    If c = "%" And i + 2 <= Len(s) Then
      r = r & Chr(CLng("&H" & Mid(s, i + 1, 2)))
      i = i + 3
    ElseIf c = "+" Then
      r = r & " " : i = i + 1
    Else
      r = r & c : i = i + 1
    End If
  Loop
  URLDecode = r
End Function
