Add-Type -AssemblyName System.Drawing
$pngPath = "$PSScriptRoot\app_icon.png"
$icoPath = "$PSScriptRoot\app_icon.ico"

if (Test-Path $pngPath) {
    $bmp = [System.Drawing.Bitmap]::FromFile($pngPath)
    $iconBmp = New-Object System.Drawing.Bitmap(256, 256)
    $g = [System.Drawing.Graphics]::FromImage($iconBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($bmp, 0, 0, 256, 256)
    
    $hIcon = $iconBmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    $stream = [System.IO.File]::Create($icoPath)
    $icon.Save($stream)
    $stream.Close()
    
    $icon.Dispose()
    $iconBmp.Dispose()
    $bmp.Dispose()
    $g.Dispose()
    Write-Host "Icon converted successfully: $icoPath"
} else {
    Write-Error "PNG icon not found at $pngPath"
}
