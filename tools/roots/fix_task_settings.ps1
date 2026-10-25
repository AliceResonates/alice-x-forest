#Requires -RunAsAdministrator
# Einmalig ausfuehren (Rechtsklick -> Als Administrator ausfuehren), damit
# beide Roots-Tasks auf einem Laptop zuverlaessig laufen:
#   - Kein Stopp bei Akkubetrieb
#   - Kein 72h-Zeitlimit (die Dienste sind Endlos-Poller)
#   - StartWhenAvailable: verpasste Trigger nach Standby nachholen

$taskNames = @('RootsWorker', 'RootsReingest')

foreach ($name in $taskNames) {
    try {
        $task = Get-ScheduledTask -TaskName $name -ErrorAction Stop
    } catch {
        Write-Warning "$name nicht gefunden — uebersprungen."
        continue
    }

    $s = $task.Settings
    $s.DisallowStartIfOnBatteries = $false
    $s.StopIfGoingOnBatteries = $false
    $s.ExecutionTimeLimit = 'PT0S'
    $s.StartWhenAvailable = $true

    Set-ScheduledTask -TaskName $name -Settings $s
    Write-Output "[OK] $name: Akku=$($s.DisallowStartIfOnBatteries), StopAkku=$($s.StopIfGoingOnBatteries), Zeitlimit=$($s.ExecutionTimeLimit), StartWhenAvail=$($s.StartWhenAvailable)"
}
