# PowerShell script to generate extension icons

Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param(
        [int]$size,
        [string]$outputPath
    )
    
    # Create bitmap
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    
    # Create gradient background
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $color1 = [System.Drawing.Color]::FromArgb(255, 255, 107, 53)  # #ff6b35
    $color2 = [System.Drawing.Color]::FromArgb(255, 255, 140, 66)  # #ff8c42
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $color1, $color2, 45)
    $graphics.FillRectangle($brush, $rect)
    
    # Draw "P" text
    $font = New-Object System.Drawing.Font("Arial", [int]($size * 0.5), [System.Drawing.FontStyle]::Bold)
    $textBrush = [System.Drawing.Brushes]::White
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rectF = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $graphics.DrawString("P", $font, $textBrush, $rectF, $format)
    
    # Draw border
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [Math]::Max(1, $size / 16))
    $borderRect = New-Object System.Drawing.Rectangle([int]($size / 16), [int]($size / 16), [int]($size - $size / 8), [int]($size - $size / 8))
    $graphics.DrawRectangle($pen, $borderRect)
    
    # Save as PNG
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush.Dispose()
    $pen.Dispose()
    $font.Dispose()
    
    Write-Host "Created: $outputPath"
}

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Create icons
Create-Icon -size 16 -outputPath (Join-Path $scriptPath "icon16.png")
Create-Icon -size 48 -outputPath (Join-Path $scriptPath "icon48.png")
Create-Icon -size 128 -outputPath (Join-Path $scriptPath "icon128.png")

Write-Host "`nAll icons created successfully!" -ForegroundColor Green
Write-Host "You can now reload the extension in Chrome."
