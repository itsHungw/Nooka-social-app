# Local Runner and Firebase Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a dependency-free PowerShell runner that loads local `.env`, starts PostgreSQL, maps configuration into Spring Boot, and supports Firebase Admin ADC safely.

**Architecture:** Keep `.env` as the Docker Compose-facing source with project-prefixed `NOOKA_*` variables. `run.ps1` parses that file, validates non-secret configuration, exports process-scoped Spring variables, optionally resolves Firebase credentials, waits for PostgreSQL health, and invokes Maven. A standalone PowerShell regression script tests runner behavior without Pester or new dependencies.

**Tech Stack:** Windows PowerShell 5.1+, Docker Compose, Maven Wrapper, Spring Boot 4.1.0, Firebase Admin Java SDK 9.10.0.

**Repository rule:** Do not create commits, branches, or worktrees.

---

## File Structure

- Create `run.ps1`: local configuration loader and application entry point.
- Create `scripts/test-run.ps1`: dependency-free behavior tests for `run.ps1 -Check`.
- Modify `.env.example`: add optional Firebase credential path.
- Modify ignored `.env`: add the same local placeholder for the current developer.
- Modify `README.md`: document runner usage, auth modes, ADC, and Docker limitation.
- Modify `MEMORY.md`: record the stable runner convention.

### Task 1: Establish Runner Regression Tests

**Files:**
- Create: `scripts/test-run.ps1`
- Test: `scripts/test-run.ps1`

- [x] **Step 1: Write the failing test harness**

Create a plain PowerShell script that:

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $projectRoot 'run.ps1'
if (-not (Test-Path -LiteralPath $runner -PathType Leaf)) {
    throw "Runner not found: $runner"
}
```

It must create temporary `.env` fixtures and invoke:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $runner -EnvFile $envPath -Check
```

Cover these behaviors:

1. Auth disabled returns exit code `0`, reports `Authentication: disabled`, and does not echo `DB_PASSWORD`.
2. Auth enabled with blank project ID returns non-zero and mentions `NOOKA_FIREBASE_PROJECT_ID`.
3. Auth enabled with a missing explicit credential file returns non-zero and mentions `NOOKA_FIREBASE_CREDENTIALS` without printing file contents.

- [x] **Step 2: Run tests to verify RED**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-run.ps1
```

Expected: FAIL because `run.ps1` does not exist.

### Task 2: Implement Environment Loading and Validation

**Files:**
- Create: `run.ps1`
- Test: `scripts/test-run.ps1`

- [x] **Step 1: Implement runner parameters and dotenv parsing**

Expose:

```powershell
[CmdletBinding()]
param(
    [string]$EnvFile = '.env',
    [switch]$Check,
    [switch]$SkipDatabase
)
```

Implement focused functions:

```powershell
Resolve-ProjectPath
Read-DotEnv
Get-RequiredValue
ConvertTo-BooleanValue
ConvertTo-PortValue
Set-ProcessEnvironment
Resolve-FirebaseCredentials
Wait-PostgresHealthy
```

Parsing rules:

- Ignore blank lines and lines whose trimmed form starts with `#`.
- Accept optional `export ` prefix.
- Split on the first `=` only.
- Require keys matching `^[A-Za-z_][A-Za-z0-9_]*$`.
- Remove matching surrounding single or double quotes.
- Never print parsed values except non-sensitive host, port, database name, and feature status.

- [x] **Step 2: Map `.env` into Spring process variables**

Use this exact mapping:

```powershell
$mapping = @{
    NOOKA_DB_NAME = 'DB_NAME'
    NOOKA_DB_USER = 'DB_USER'
    NOOKA_DB_PASSWORD = 'DB_PASSWORD'
    NOOKA_DB_PORT = 'DB_PORT'
    NOOKA_API_PORT = 'PORT'
    NOOKA_AUTH_ENABLED = 'AUTH_ENABLED'
    NOOKA_FIREBASE_PROJECT_ID = 'FIREBASE_PROJECT_ID'
    NOOKA_OPENAPI_ENABLED = 'OPENAPI_ENABLED'
}
```

Set `DB_HOST=localhost`. Set all values at `Process` scope only.

- [x] **Step 3: Implement Firebase ADC handling**

Read optional `NOOKA_FIREBASE_CREDENTIALS`.

- If set, resolve it relative to the backend root, require a real file, and set process-scoped `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path.
- If auth is enabled, require `NOOKA_FIREBASE_PROJECT_ID`.
- If auth is enabled and neither explicit credentials nor an existing `GOOGLE_APPLICATION_CREDENTIALS` is present, print a warning that Firebase Admin will try another host ADC source and remain fail-closed at startup.
- Never read or print JSON credential contents.

- [x] **Step 4: Verify GREEN for check-mode tests**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-run.ps1
```

Expected: PASS for all three behavior cases.

### Task 3: Start PostgreSQL and Run Maven

**Files:**
- Modify: `run.ps1`
- Test: `scripts/test-run.ps1`

- [x] **Step 1: Add non-check execution path**

When `-Check` is absent:

1. Unless `-SkipDatabase` is set, run:

```powershell
docker compose --env-file <absolute-env-path> -f <absolute-compose-path> up -d postgres
```

2. Resolve the PostgreSQL container ID through `docker compose ... ps -q postgres`.
3. Poll `docker inspect` for health status for up to 120 seconds.
4. On unhealthy/timeout, show the last 100 PostgreSQL log lines and fail.
5. Run the absolute Maven Wrapper path:

```powershell
& <project-root>\mvnw.cmd spring-boot:run
exit $LASTEXITCODE
```

PostgreSQL remains running after Maven exits.

- [x] **Step 2: Re-run runner tests**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-run.ps1
```

Expected: PASS without starting Docker because all fixtures use `-Check`.

### Task 4: Update Local Configuration and Documentation

**Files:**
- Modify: `.env.example`
- Modify: `.env`
- Modify: `README.md`
- Modify: `MEMORY.md`

- [x] **Step 1: Add Firebase credential path**

Add without a real secret:

```dotenv
# Host path used only by run.ps1; keep the JSON outside Git.
NOOKA_FIREBASE_CREDENTIALS=
```

- [x] **Step 2: Document runner commands**

Document:

```powershell
.\run.ps1
.\run.ps1 -Check
.\run.ps1 -SkipDatabase
```

Explain that `.env` is loaded by `run.ps1`, while raw `mvnw.cmd spring-boot:run` still does not load it automatically.

- [x] **Step 3: Document Firebase auth flow**

Document both configurations:

```dotenv
NOOKA_AUTH_ENABLED=false
```

and:

```dotenv
NOOKA_AUTH_ENABLED=true
NOOKA_FIREBASE_PROJECT_ID=your-project-id
NOOKA_FIREBASE_CREDENTIALS=C:\path\outside\repo\service-account.json
```

Explain that the mobile app obtains an ID token, sends `Authorization: Bearer <token>`, Firebase Admin verifies it, and the backend principal is the verified Firebase UID. State that Compose does not mount host Firebase credentials in this foundation.

### Task 5: Verify the Complete Change

**Files:**
- Test: `scripts/test-run.ps1`
- Test: existing Maven and Compose checks

- [x] **Step 1: Run PowerShell runner tests**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-run.ps1
```

Expected: all runner cases pass.

- [x] **Step 2: Validate the real local `.env`**

```powershell
.\run.ps1 -Check
```

Expected: exit `0`, auth status shown, no password/token/credential contents printed.

- [x] **Step 3: Validate Compose interpolation**

```powershell
docker compose --env-file .env -f infra/compose.yaml config
```

Expected: exit `0`; current Compose services remain valid.

- [x] **Step 4: Run Maven tests**

```powershell
.\mvnw.cmd test
```

Expected: all existing tests pass, including PostgreSQL visibility tests.

- [x] **Step 5: Run final safety checks**

```powershell
git diff --check
git status --short
git check-ignore -v .env
```

Expected: clean diff check, `.env` ignored, no credential JSON or secret value added, and no commit created.
