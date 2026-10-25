# Startet den Roots-Reingest-Dienst mit Umgebung aus der Projekt-.env.
# Gedacht fuer den Windows-Scheduled-Task "RootsReingest" (Trigger: Anmeldung)
# -- damit der Dienst nach einem Neustart/Ruhezustand nicht manuell neu
# gestartet werden muss. Selbes Muster wie start_roots_worker.ps1.
#
# Sobald ROOTS_REINGEST_URL in der .env gesetzt wird, verlaesst
# roots_reingest.py automatisch den Dry-Run (main() erzwingt ihn, wenn
# keine URL da ist). Der Go-Orchestrator-Endpunkt muss also nur in die
# .env eingetragen werden, kein Umbau am Task noetig.

$RepoRoot = "C:\Users\Yasmin\source\repos\yasmingreveyg-alt\alice-x-forest"
$EnvFile  = Join-Path $RepoRoot ".env"
$LogFile  = Join-Path $RepoRoot "tools\roots\reingest.log"
$ErrFile  = Join-Path $RepoRoot "tools\roots\reingest.err.log"

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
$env:PYTHONIOENCODING = "utf-8"

Set-Location $RepoRoot
Start-Process -FilePath "python" `
    -ArgumentList "-u", "tools\roots\roots_reingest.py" `
    -RedirectStandardOutput $LogFile `
    -RedirectStandardError $ErrFile `
    -NoNewWindow -Wait
