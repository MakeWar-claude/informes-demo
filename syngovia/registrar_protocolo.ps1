# Registra el protocolo de URL  syngovia:  para el usuario actual (HKCU, sin admin).
# Tras ejecutarlo, un enlace  <a href="syngovia:a/123456">  abre el estudio
# en el syngo.via ya abierto.  Reversible con desregistrar_protocolo.ps1
$ErrorActionPreference = 'Stop'

$vbs = Join-Path $PSScriptRoot 'abrir_syngovia.vbs'
if (-not (Test-Path $vbs)) { throw "No encuentro $vbs" }

$cmd  = "wscript.exe `"$vbs`" `"%1`""
$base = 'HKCU:\Software\Classes\syngovia'

New-Item -Path $base -Force | Out-Null
Set-ItemProperty -Path $base -Name '(default)'    -Value 'URL:syngo.via Image Call-Up'
Set-ItemProperty -Path $base -Name 'URL Protocol' -Value ''
New-Item -Path "$base\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "$base\shell\open\command" -Name '(default)' -Value $cmd

Write-Host "OK - protocolo 'syngovia:' registrado en HKCU." -ForegroundColor Green
Write-Host "    comando: $cmd"
Write-Host ""
Write-Host "Prueba (sustituye 123456 por una peticion real):"
Write-Host "    start syngovia:a/123456"
