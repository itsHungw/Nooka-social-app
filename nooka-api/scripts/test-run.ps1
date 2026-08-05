Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $projectRoot 'run.ps1'

if (-not (Test-Path -LiteralPath $runner -PathType Leaf)) {
    throw "Runner not found: $runner"
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("nooka-runner-tests-" + [System.Guid]::NewGuid())
[System.IO.Directory]::CreateDirectory($tempRoot) | Out-Null

function Write-TestEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Content
    )

    $path = Join-Path $tempRoot $Name
    [System.IO.File]::WriteAllText($path, $Content, [System.Text.UTF8Encoding]::new($false))
    return $path
}

function Invoke-RunnerCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string]$EnvPath
    )

    $stdoutPath = Join-Path $tempRoot ([System.Guid]::NewGuid().ToString() + '.stdout')
    $stderrPath = Join-Path $tempRoot ([System.Guid]::NewGuid().ToString() + '.stderr')
    $arguments = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', ('"' + $runner + '"'),
        '-EnvFile', ('"' + $EnvPath + '"'),
        '-Check'
    )
    $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments `
            -Wait -PassThru -NoNewWindow `
            -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    $output = [System.IO.File]::ReadAllText($stdoutPath) + [System.IO.File]::ReadAllText($stderrPath)

    return [pscustomobject]@{
        ExitCode = $process.ExitCode
        Output = $output
    }
}

function Assert-Equal {
    param($Actual, $Expected, [string]$Message)
    if ($Actual -ne $Expected) {
        throw "$Message. Expected '$Expected', got '$Actual'."
    }
}

function Assert-Contains {
    param([string]$Actual, [string]$Expected, [string]$Message)
    if (-not $Actual.Contains($Expected)) {
        throw "$Message. Expected output to contain '$Expected'. Output: $Actual"
    }
}

function Assert-NotContains {
    param([string]$Actual, [string]$Unexpected, [string]$Message)
    if ($Actual.Contains($Unexpected)) {
        throw "$Message. Output contained a sensitive value."
    }
}

$baseEnv = @(
    'COMPOSE_PROJECT_NAME=nooka-test'
    'NOOKA_DB_NAME=nooka'
    'NOOKA_DB_USER=nooka'
    'NOOKA_DB_PASSWORD=super-secret=value'
    'NOOKA_DB_PORT=5432'
    'NOOKA_API_PORT=8080'
    'NOOKA_OPENAPI_ENABLED=true'
) -join "`n"

$tests = @(
    @{
        Name = 'auth disabled passes without exposing password'
        Run = {
            $content = $baseEnv + "`n" + (@(
                'NOOKA_AUTH_ENABLED=false'
                'NOOKA_FIREBASE_PROJECT_ID='
                'NOOKA_FIREBASE_CREDENTIALS='
            ) -join "`n")
            $envPath = Write-TestEnv 'auth-disabled.env' $content
            $result = Invoke-RunnerCheck $envPath
            Assert-Equal $result.ExitCode 0 'Auth-disabled check failed'
            Assert-Contains $result.Output 'Authentication: disabled' 'Auth status was not reported'
            Assert-NotContains $result.Output 'super-secret=value' 'Database password leaked'
        }
    },
    @{
        Name = 'auth enabled requires Firebase project ID'
        Run = {
            $content = $baseEnv + "`n" + (@(
                'NOOKA_AUTH_ENABLED=true'
                'NOOKA_FIREBASE_PROJECT_ID='
                'NOOKA_FIREBASE_CREDENTIALS='
            ) -join "`n")
            $envPath = Write-TestEnv 'missing-project.env' $content
            $result = Invoke-RunnerCheck $envPath
            if ($result.ExitCode -eq 0) {
                throw 'Auth-enabled check unexpectedly succeeded without a project ID.'
            }
            Assert-Contains $result.Output 'NOOKA_FIREBASE_PROJECT_ID' 'Missing project ID error was unclear'
            Assert-NotContains $result.Output 'super-secret=value' 'Database password leaked'
        }
    },
    @{
        Name = 'explicit Firebase credential path must exist'
        Run = {
            $content = $baseEnv + "`n" + (@(
                'NOOKA_AUTH_ENABLED=true'
                'NOOKA_FIREBASE_PROJECT_ID=nooka-test'
                'NOOKA_FIREBASE_CREDENTIALS=missing-service-account.json'
            ) -join "`n")
            $envPath = Write-TestEnv 'missing-credential.env' $content
            $result = Invoke-RunnerCheck $envPath
            if ($result.ExitCode -eq 0) {
                throw 'Auth-enabled check unexpectedly succeeded with a missing credential file.'
            }
            Assert-Contains $result.Output 'NOOKA_FIREBASE_CREDENTIALS' 'Missing credential error was unclear'
            Assert-NotContains $result.Output 'super-secret=value' 'Database password leaked'
        }
    }
)

$failures = 0
try {
    foreach ($test in $tests) {
        try {
            & $test.Run
            Write-Output "PASS: $($test.Name)"
        } catch {
            $failures++
            Write-Error "FAIL: $($test.Name): $($_.Exception.Message)"
        }
    }
} finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
}

if ($failures -gt 0) {
    exit 1
}

Write-Output "All $($tests.Count) runner tests passed."
