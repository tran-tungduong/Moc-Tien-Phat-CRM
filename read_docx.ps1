Add-Type -AssemblyName 'WindowsBase'
$path = "d:\APP Bao Cao - Sale MKT\HỢP ĐỒNG THI CÔNG NỘI THẤT .docx"
$pkg = [System.IO.Packaging.Package]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
$part = $pkg.GetPart([System.Uri]'/word/document.xml')
$stream = $part.GetStream()
$reader = New-Object System.IO.StreamReader($stream)
$xml = $reader.ReadToEnd()
$reader.Close()
$pkg.Close()
# Strip XML tags to get plain text
$text = $xml -replace '<[^>]+>', ''
$text | Out-File -Encoding UTF8 "d:\APP Bao Cao - Sale MKT\contract_content.txt"
Write-Host "Done"
