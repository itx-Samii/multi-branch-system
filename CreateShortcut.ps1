$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$SourceDir = $PSScriptRoot
$Shortcut = $WshShell.CreateShortcut("$Desktop\Fee Management System.lnk")
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = "`"$SourceDir\Launcher.vbs`""
$Shortcut.WorkingDirectory = "$SourceDir"
$Shortcut.IconLocation = "$SourceDir\app_icon.ico"
$Shortcut.Description = "Launch School Fee Management System"
$Shortcut.Save()

Write-Host "Desktop Shortcut Created Successfully!" -ForegroundColor Green
