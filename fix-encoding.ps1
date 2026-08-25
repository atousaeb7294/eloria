$files = get-childitem -path "src" -recurse -include *.tsx,*.ts

$encoding = [System.Text.Encoding]::GetEncoding("iso-8859-1")
$utf8 = [System.Text.Encoding]::UTF8

foreach ($file in $files) {
    $text = get-content -literalpath $file.fullname -raw

    if ($text -match "Ø|Ù|â€|Û") {
        $bytes = $encoding.GetBytes($text)
        $fixed = $utf8.GetString($bytes)

        set-content -literalpath $file.fullname -value $fixed -encoding utf8

        write-host "fixed:" $file.fullname
    }
}
