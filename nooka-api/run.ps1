[CmdletBinding()]
param(
    [string]$EnvFile = '.env',
    [switch]$Check,
    [switch]$SkipDatabase
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-ProjectPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $Path))
}

function Read-DotEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Environment file not found: $Path. Copy .env.example to .env first."
    }

    $values = @{}
    $lineNumber = 0

    foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
        $lineNumber++
        $trimmed = $line.Trim()
        if ($trimmed.Length -eq 0 -or $trimmed.StartsWith('#')) {
            continue
        }
        if ($trimmed.StartsWith('export ')) {
            $trimmed = $trimmed.Substring(7).TrimStart()
        }

        $separator = $trimmed.IndexOf('=')
        if ($separator -lt 1) {
            throw "Invalid environment entry at line $lineNumber. Expected KEY=VALUE."
        }

        $key = $trimmed.Substring(0, $separator).Trim()
        if ($key -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
            throw "Invalid environment variable name at line $lineNumber."
        }

        $value = $trimmed.Substring($separator + 1).Trim()
        if ($value.Length -ge 2) {
            $first = $value[0]
            $last = $value[$value.Length - 1]
            if (($first -eq "'" -and $last -eq "'") -or ($first -eq '"' -and $last -eq '"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }

        $values[$key] = $value
    }

    return $values
}

function Get-RequiredValue {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Values,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not $Values.ContainsKey($Name) -or [string]::IsNullOrWhiteSpace([string]$Values[$Name])) {
        throw "$Name is required in the environment file."
    }

    return [string]$Values[$Name]
}

function Get-OptionalValue {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Values,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not $Values.ContainsKey($Name)) {
        return ''
    }

    return [string]$Values[$Name]
}

function ConvertTo-BooleanValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    switch ($Value.Trim().ToLowerInvariant()) {
        'true' { return $true }
        'false' { return $false }
        default { throw "$Name must be either true or false." }
    }
}

function ConvertTo-PortValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $port = 0
    if (-not [int]::TryParse($Value, [ref]$port) -or $port -lt 1 -or $port -gt 65535) {
        throw "$Name must be a valid TCP port between 1 and 65535."
    }

    return $port
}

function Set-ProcessEnvironment {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Values,
        [Parameter(Mandatory = $true)]
        [hashtable]$Mapping
    )

    foreach ($entry in $Values.GetEnumerator()) {
        [System.Environment]::SetEnvironmentVariable(
                [string]$entry.Key, [string]$entry.Value, 'Process')
    }

    foreach ($sourceName in $Mapping.Keys) {
        if ($Values.ContainsKey($sourceName)) {
            [System.Environment]::SetEnvironmentVariable(
                    [string]$Mapping[$sourceName], [string]$Values[$sourceName], 'Process')
        }
    }

    [System.Environment]::SetEnvironmentVariable('DB_HOST', 'localhost', 'Process')
    [System.Environment]::SetEnvironmentVariable('REDIS_HOST', 'localhost', 'Process')
}

function Wait-PostgresHealthy {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$ComposeArguments
    )

    $containerId = ''
    for ($attempt = 1; $attempt -le 10; $attempt++) {
        $containerIds = @(& docker @ComposeArguments ps -q postgres)
        $composeExitCode = $LASTEXITCODE
        if ($composeExitCode -eq 0 -and $containerIds.Count -gt 0 `
                -and -not [string]::IsNullOrWhiteSpace([string]$containerIds[0])) {
            $containerId = ([string]$containerIds[0]).Trim()
            break
        }
        Start-Sleep -Seconds 1
    }
    if ([string]::IsNullOrWhiteSpace($containerId)) {
        throw 'Could not resolve the PostgreSQL container after Compose startup.'
    }

    for ($attempt = 1; $attempt -le 60; $attempt++) {
        $health = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $containerId 2>$null | Out-String).Trim()
        if ($LASTEXITCODE -eq 0) {
            if ($health -eq 'healthy' -or $health -eq 'running') {
                return
            }
            if ($health -eq 'unhealthy' -or $health -eq 'exited' -or $health -eq 'dead') {
                & docker @ComposeArguments logs --no-color --tail 100 postgres
                throw "PostgreSQL container entered state '$health'."
            }
        }
        Start-Sleep -Seconds 2
    }

    & docker @ComposeArguments logs --no-color --tail 100 postgres
    throw 'PostgreSQL did not become healthy within 120 seconds.'
}

function Wait-RedisHealthy {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$ComposeArguments
    )

    $containerId = ''
    for ($attempt = 1; $attempt -le 10; $attempt++) {
        $containerIds = @(& docker @ComposeArguments ps -q redis)
        $composeExitCode = $LASTEXITCODE
        if ($composeExitCode -eq 0 -and $containerIds.Count -gt 0 `
                -and -not [string]::IsNullOrWhiteSpace([string]$containerIds[0])) {
            $containerId = ([string]$containerIds[0]).Trim()
            break
        }
        Start-Sleep -Seconds 1
    }
    if ([string]::IsNullOrWhiteSpace($containerId)) {
        throw 'Could not resolve the Redis container after Compose startup.'
    }

    for ($attempt = 1; $attempt -le 60; $attempt++) {
        $health = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $containerId 2>$null | Out-String).Trim()
        if ($LASTEXITCODE -eq 0) {
            if ($health -eq 'healthy' -or $health -eq 'running') {
                return
            }
            if ($health -eq 'unhealthy' -or $health -eq 'exited' -or $health -eq 'dead') {
                & docker @ComposeArguments logs --no-color --tail 100 redis
                throw "Redis container entered state '$health'."
            }
        }
        Start-Sleep -Seconds 2
    }

    & docker @ComposeArguments logs --no-color --tail 100 redis
    throw 'Redis did not become healthy within 120 seconds.'
}
$envPath = Resolve-ProjectPath $EnvFile
$values = Read-DotEnv $envPath

$dbName = Get-RequiredValue $values 'NOOKA_DB_NAME'
$dbUser = Get-RequiredValue $values 'NOOKA_DB_USER'
$dbPassword = Get-RequiredValue $values 'NOOKA_DB_PASSWORD'
$dbPort = ConvertTo-PortValue 'NOOKA_DB_PORT' (Get-RequiredValue $values 'NOOKA_DB_PORT')
$apiPort = ConvertTo-PortValue 'NOOKA_API_PORT' (Get-RequiredValue $values 'NOOKA_API_PORT')
$redisPortText = Get-OptionalValue $values 'NOOKA_REDIS_PORT'
if ([string]::IsNullOrWhiteSpace($redisPortText)) {
    $redisPortText = '6379'
}
$redisPort = ConvertTo-PortValue 'NOOKA_REDIS_PORT' $redisPortText
$authEnabled = ConvertTo-BooleanValue 'NOOKA_AUTH_ENABLED' (Get-RequiredValue $values 'NOOKA_AUTH_ENABLED')
$openApiEnabled = ConvertTo-BooleanValue 'NOOKA_OPENAPI_ENABLED' (Get-RequiredValue $values 'NOOKA_OPENAPI_ENABLED')

$mapping = @{
    NOOKA_DB_NAME = 'DB_NAME'
    NOOKA_DB_USER = 'DB_USER'
    NOOKA_DB_PASSWORD = 'DB_PASSWORD'
    NOOKA_DB_PORT = 'DB_PORT'
    NOOKA_API_PORT = 'PORT'
    NOOKA_REDIS_PORT = 'REDIS_PORT'
    NOOKA_REDIS_PASSWORD = 'REDIS_PASSWORD'
    NOOKA_AUTH_ENABLED = 'AUTH_ENABLED'
    NOOKA_AUTH_ACCESS_TOKEN_TTL = 'AUTH_ACCESS_TOKEN_TTL'
    NOOKA_AUTH_REFRESH_TOKEN_TTL = 'AUTH_REFRESH_TOKEN_TTL'
    NOOKA_AUTH_VERIFICATION_CODE_TTL = 'AUTH_VERIFICATION_CODE_TTL'
    NOOKA_AUTH_RESET_CODE_TTL = 'AUTH_RESET_CODE_TTL'
    NOOKA_AUTH_MAX_CODE_ATTEMPTS = 'AUTH_MAX_CODE_ATTEMPTS'
    NOOKA_AUTH_EMAIL_ENABLED = 'AUTH_EMAIL_ENABLED'
    NOOKA_AUTH_EMAIL_HOST = 'AUTH_EMAIL_HOST'
    NOOKA_AUTH_EMAIL_PORT = 'AUTH_EMAIL_PORT'
    NOOKA_AUTH_EMAIL_USERNAME = 'AUTH_EMAIL_USERNAME'
    NOOKA_AUTH_EMAIL_PASSWORD = 'AUTH_EMAIL_PASSWORD'
    NOOKA_AUTH_EMAIL_FROM = 'AUTH_EMAIL_FROM'
    NOOKA_OAUTH_GOOGLE_CLIENT_ID = 'OAUTH_GOOGLE_CLIENT_ID'
    NOOKA_OAUTH_APPLE_CLIENT_ID = 'OAUTH_APPLE_CLIENT_ID'
    NOOKA_OAUTH_FACEBOOK_APP_ID = 'OAUTH_FACEBOOK_APP_ID'
    NOOKA_OAUTH_FACEBOOK_APP_SECRET = 'OAUTH_FACEBOOK_APP_SECRET'
    NOOKA_OAUTH_FACEBOOK_GRAPH_BASE_URL = 'OAUTH_FACEBOOK_GRAPH_BASE_URL'
    NOOKA_OPENAPI_ENABLED = 'OPENAPI_ENABLED'
}
Set-ProcessEnvironment $values $mapping

Write-Output "Environment file: $envPath"
Write-Output "Database: localhost:$dbPort/$dbName"
Write-Output "Redis: localhost:$redisPort"
Write-Output "API port: $apiPort"
Write-Output "OpenAPI: $(if ($openApiEnabled) { 'enabled' } else { 'disabled' })"
Write-Output "Authentication: $(if ($authEnabled) { 'enabled' } else { 'disabled' })"

if ($Check) {
    Write-Output 'Configuration check passed.'
    return
}

if (-not $SkipDatabase) {
    $composeFile = Join-Path $PSScriptRoot 'infra\compose.yaml'
    $composeArguments = @('compose', '--env-file', $envPath, '-f', $composeFile)
    & docker @composeArguments up -d postgres redis
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose failed to start PostgreSQL and Redis with exit code $LASTEXITCODE."
    }
    Wait-PostgresHealthy $composeArguments
    Wait-RedisHealthy $composeArguments
    Write-Output 'PostgreSQL: healthy'
    Write-Output 'Redis: healthy'
}

$mavenWrapper = Join-Path $PSScriptRoot 'mvnw.cmd'
Push-Location $PSScriptRoot
try {
    & $mavenWrapper spring-boot:run
    $mavenExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

exit $mavenExitCode
