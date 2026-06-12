param(
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
$BuildDir = Join-Path $Root "build"

$machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath"

if (-not (Test-Path "lstlisting.tex")) {
    New-Item -ItemType File -Path "lstlisting.tex" | Out-Null
}

if (-not (Test-Path $BuildDir)) {
    New-Item -ItemType Directory -Path $BuildDir | Out-Null
}

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    Write-Host "==> $Name" -ForegroundColor Cyan
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $Command @Arguments 2>&1 | ForEach-Object { Write-Host $_ }
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($exitCode -ne 0) {
        throw "$Name failed with exit code $exitCode"
    }
}

if (-not (Get-Command pdflatex -ErrorAction SilentlyContinue)) {
    throw "pdflatex was not found. Install MiKTeX or TeX Live, then open a new terminal."
}

if (-not (Get-Command bibtex -ErrorAction SilentlyContinue)) {
    throw "bibtex was not found. Install MiKTeX or TeX Live, then open a new terminal."
}

if (Get-Command initexmf -ErrorAction SilentlyContinue) {
    & initexmf --set-config-value=[MPM]AutoInstall=1 | Out-Null
}

if ($Clean) {
    $patterns = @("*.aux", "*.bbl", "*.bcf", "*.blg", "*.fdb_latexmk", "*.fls", "*.glg", "*.glo", "*.gls", "*.ist", "*.lof", "*.log", "*.lot", "*.out", "*.run.xml", "*.toc", "*.acn", "*.acr", "*.alg")
    foreach ($pattern in $patterns) {
        Get-ChildItem -Path $Root -Recurse -Filter $pattern -File -ErrorAction SilentlyContinue | Remove-Item -Force
    }
    Get-ChildItem -Path $BuildDir -File -ErrorAction SilentlyContinue | Remove-Item -Force
}

$pdfArgs = @("-interaction=nonstopmode", "-file-line-error", "-output-directory=$BuildDir", "DoAn.tex")

Invoke-Step "pdflatex pass 1" "pdflatex" $pdfArgs
Invoke-Step "bibtex" "bibtex" @((Join-Path $BuildDir "DoAn"))
Invoke-Step "pdflatex pass 2" "pdflatex" $pdfArgs
Invoke-Step "bibtex pass 2" "bibtex" @((Join-Path $BuildDir "DoAn"))
Invoke-Step "pdflatex pass 3" "pdflatex" $pdfArgs
Invoke-Step "pdflatex pass 4" "pdflatex" $pdfArgs

$builtPdf = Join-Path $BuildDir "DoAn.pdf"
$rootPdf = Join-Path $Root "DoAn.pdf"
if (Test-Path $builtPdf) {
    try {
        Copy-Item -LiteralPath $builtPdf -Destination $rootPdf -Force
        Write-Host "Build completed: $rootPdf" -ForegroundColor Green
    } catch {
        Write-Warning "Build succeeded, but $rootPdf could not be overwritten. It may be open in another application."
        Write-Host "Build completed: $builtPdf" -ForegroundColor Green
    }
} else {
    throw "Build finished but DoAn.pdf was not found in $BuildDir."
}
