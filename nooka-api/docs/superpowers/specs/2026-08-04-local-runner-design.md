# Local Runner and Firebase Auth Design

**Date:** 2026-08-04
**Scope:** `nooka-api` local development only

## Goal

Provide a root-level `run.ps1` that starts the backend from any working directory, loads the ignored `.env` file, starts local PostgreSQL, maps Compose-oriented `NOOKA_*` values to Spring Boot runtime variables, validates Firebase configuration, and runs Maven without adding a dotenv dependency.

## Command Contract

```powershell
.\run.ps1
.\run.ps1 -Check
.\run.ps1 -SkipDatabase
.\run.ps1 -EnvFile .env.local
```

- Default: load configuration, start and wait for the Compose PostgreSQL service, then run `mvnw.cmd spring-boot:run`.
- `-Check`: load and validate configuration without starting Docker or Maven; print only non-sensitive status.
- `-SkipDatabase`: run the application without starting PostgreSQL.
- `-EnvFile`: accept an absolute path or a path relative to the backend root.

The script leaves PostgreSQL running after the application exits so local data remains available. Existing Compose commands remain the explicit way to stop it.

## Environment Mapping

| `.env` source | Spring process target |
|---|---|
| `NOOKA_DB_NAME` | `DB_NAME` |
| `NOOKA_DB_USER` | `DB_USER` |
| `NOOKA_DB_PASSWORD` | `DB_PASSWORD` |
| `NOOKA_DB_PORT` | `DB_PORT` |
| `NOOKA_API_PORT` | `PORT` |
| `NOOKA_AUTH_ENABLED` | `AUTH_ENABLED` |
| `NOOKA_FIREBASE_PROJECT_ID` | `FIREBASE_PROJECT_ID` |
| `NOOKA_OPENAPI_ENABLED` | `OPENAPI_ENABLED` |

`DB_HOST` is set to `localhost` for a host-run Spring process. Values are set only in the child PowerShell process and are not persisted to the user or machine environment.

## Firebase Credentials

Add optional `NOOKA_FIREBASE_CREDENTIALS` to `.env` and `.env.example`.

- When set, `run.ps1` resolves the path relative to the backend root, requires the file to exist, and exports the absolute path as `GOOGLE_APPLICATION_CREDENTIALS` for the Spring process.
- The service-account JSON stays outside Git and outside the Docker build context.
- When omitted, Firebase Admin falls back to existing Application Default Credentials available to the host environment.
- The script never reads, parses, or prints the JSON contents.

Firebase Admin continues to initialize with `GoogleCredentials.getApplicationDefault()`, receives the explicit Firebase project ID, and verifies client ID tokens using `FirebaseAuth.verifyIdToken()`.

## Auth Modes

### Auth disabled

```dotenv
NOOKA_AUTH_ENABLED=false
NOOKA_FIREBASE_PROJECT_ID=
NOOKA_FIREBASE_CREDENTIALS=
```

Firebase beans remain disabled. Local endpoints are permitted by the explicit local security configuration.

### Auth enabled

```dotenv
NOOKA_AUTH_ENABLED=true
NOOKA_FIREBASE_PROJECT_ID=your-firebase-project-id
NOOKA_FIREBASE_CREDENTIALS=C:\absolute\path\to\service-account.json
```

The runner requires a project ID. Credentials may come from `NOOKA_FIREBASE_CREDENTIALS`, an existing `GOOGLE_APPLICATION_CREDENTIALS`, or another host ADC source. Missing usable ADC remains fail-closed when Spring initializes Firebase.

The mobile client sends a Firebase ID token as `Authorization: Bearer <token>`. The backend verifies it and uses the verified Firebase UID as the current principal. Client-supplied user IDs are never trusted as identity.

## Parsing and Safety

- Support blank lines, full-line comments, optional `export `, and `KEY=VALUE` split on the first equals sign.
- Strip matching single or double quotes around values.
- Reject invalid variable names, missing required values, invalid booleans, and invalid ports.
- Never print database passwords, credential contents, tokens, or private content.
- Prefix values remain `NOOKA_*` to avoid collisions with unrelated host environment variables.

## Verification

A dependency-free PowerShell test script will verify:

1. Missing `run.ps1` produces the expected initial failure before implementation.
2. `-Check` succeeds with auth disabled.
3. Auth enabled without project ID fails.
4. A configured credential path that does not exist fails without exposing its contents.
5. The existing Maven test suite and Compose configuration still pass.

## Out of Scope

- Automatically downloading or generating Firebase service-account credentials.
- Committing any `.env` or credential JSON.
- Mounting credentials into Docker Compose; this runner targets host-based Maven execution.
- Mapping Firebase UID to an internal Nooka user UUID before the Account API exists.
