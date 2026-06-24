' Test SEGURO: muestra el comando ialauncher que se generaria para una URI,
' sin ejecutar nada.  Uso:  cscript //nologo test_parse.vbs "syngovia:a/123456"
Option Explicit
Dim IALAUNCHER, SERVER
IALAUNCHER = "C:\Program Files\Siemens\syngo.via\bin\ialauncher.exe"
SERVER     = "10.136.61.220"

Dim uri, kind, value, flag, p, cmd
If WScript.Arguments.Count = 0 Then WScript.Echo "Falta la URI" : WScript.Quit 1
uri = WScript.Arguments(0)
If InStr(1, uri, "syngovia:", vbTextCompare) = 1 Then uri = Mid(uri, Len("syngovia:") + 1)
Do While Left(uri, 1) = "/" : uri = Mid(uri, 2) : Loop
If Len(uri) > 0 And Right(uri, 1) = "/" Then uri = Left(uri, Len(uri) - 1)
p = InStr(uri, "/")
If p > 0 Then kind = LCase(Left(uri, p - 1)) : value = Mid(uri, p + 1) Else kind = "a" : value = uri
Select Case kind
  Case "a","acc","accession" : flag = "-a"
  Case "pid","patient"       : flag = "-pid"
  Case "study","s1","uid"    : flag = "-s1"
  Case "series","s2"         : flag = "-s2"
  Case Else                  : flag = "-a"
End Select
cmd = """" & IALAUNCHER & """ " & flag & " """ & value & """ -server " & SERVER
WScript.Echo "URI   : " & WScript.Arguments(0)
WScript.Echo "CMD   : " & cmd
