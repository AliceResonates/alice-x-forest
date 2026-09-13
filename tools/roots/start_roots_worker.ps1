# Startet den Roots-Worker mit Umgebung aus der Projekt-.env.
# Gedacht fuer den Windows-Scheduled-Task "RootsWorker" (Trigger: Anmeldung) --
# damit der Worker nach einem Neustart/Ruhezustand nicht manuell neu
# gestartet werden muss.

$RepoRoot = "C:\Users\Yasmin\source\repos\yasmingreveyg-alt\alice-x-forest"
$EnvFile  = Join-Path $RepoRoot ".env"
$LogFile  = Join-Path $RepoRoot "tools\roots\worker.log"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
            $name = $Matches[1]
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

$env:SUPABASE_SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$env:ROOTS_VAULT = "C:\Users\Yasmin\Documents\AliceForestVault\unser_gedaechtnis"
$env:PYTHONUNBUFFERED = "1"

New-Item -ItemType Directory -Force -Path $env:ROOTS_VAULT | Out-Null

Set-Location $RepoRoot
# cmd.exe-Umleitung statt PowerShells "*>>": die native Byte-Umleitung
# bleibt UTF-8, PowerShells eigene Stream-Umleitung wandelt sonst
# unbemerkt nach UTF-16 um und das Log wird unlesbar.
cmd /c "python -u tools\roots\roots_worker.py >> `"$LogFile`" 2>&1"
