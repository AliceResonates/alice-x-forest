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
# Explizit statt der Umleitung ueberlassen: Pythons stdout-Encoding auf
# Windows haengt sonst davon ab, ob es an eine Konsole oder eine Datei/
# Pipe geht (dort oft die ANSI-Codepage statt UTF-8) -- unabhaengig
# davon, wie die Ausgabe gleich umgeleitet wird.
$env:PYTHONIOENCODING = "utf-8"

$ErrFile = Join-Path $RepoRoot "tools\roots\worker.err.log"
New-Item -ItemType Directory -Force -Path $env:ROOTS_VAULT | Out-Null

Set-Location $RepoRoot
# Start-Process direkt statt einer cmd.exe-Zwischenstufe: cmd als
# zusaetzliche Prozess-Ebene liess einen Worker "schtasks /End" ueber-
# leben (das End-Kommando hat offenbar nicht den ganzen Baum erwischt,
# der ueberlebende Prozess lief mit veraltetem, im Speicher geladenem
# Code weiter). -Wait haelt den Scheduled Task fuer die Lebensdauer
# des Workers "laufend", genau wie vorher.
Start-Process -FilePath "python" `
    -ArgumentList "-u", "tools\roots\roots_worker.py" `
    -RedirectStandardOutput $LogFile `
    -RedirectStandardError $ErrFile `
    -NoNewWindow -Wait
