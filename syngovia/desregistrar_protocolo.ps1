# Elimina el protocolo de URL  syngovia:  del usuario actual.
Remove-Item 'HKCU:\Software\Classes\syngovia' -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Protocolo 'syngovia:' eliminado (si existia)." -ForegroundColor Yellow
