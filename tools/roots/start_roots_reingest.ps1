# Startet den Roots-Reingest-Dienst. Laeuft aktuell bewusst ohne
# ROOTS_REINGEST_URL -- damit erzwingt roots_reingest.py selbst
# --dry-run (siehe main()). Das ist Absicht, kein Uebergangszustand:
# der Go-Orchestrator-Endpunkt existiert noch nicht, dieser Task testet
# vorerst nur den Windows-Lifecycle, den Vault-Scan und das Cache-
# Verhalten in Isolation (Aidyns Vorschlag). Sobald der Endpunkt steht,
# hier ROOTS_REINGEST_URL setzen -- dann verlaesst der Dienst von
# selbst den Dry-Run.

$RepoRoot = "C:\Users\Yasmin\source\repos\yasmingreveyg-alt\alice-x-forest"
$LogFile  = Join-Path $RepoRoot "tools\roots\reingest.log"
$ErrFile  = Join-Path $RepoRoot "tools\roots\reingest.err.log"

$env:ROOTS_VAULT = "C:\Users\Yasmin\Documents\AliceForestVault\unser_gedaechtnis"
$env:PYTHONUNBUFFERED = "1"
$env:PYTHONIOENCODING = "utf-8"

Set-Location $RepoRoot
Start-Process -FilePath "python" `
    -ArgumentList "-u", "tools\roots\roots_reingest.py" `
    -RedirectStandardOutput $LogFile `
    -RedirectStandardError $ErrFile `
    -NoNewWindow -Wait
