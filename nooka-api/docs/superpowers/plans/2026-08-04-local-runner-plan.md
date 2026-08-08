# Local Runner and Custom Auth Plan

## Goal

Run the Spring Boot API locally with explicit auth and SMTP configuration without logging secrets.

## Environment

- Database and Redis use the existing NOOKA_* variables.
- AUTH_ENABLED controls the local security bypass.
- AUTH_EMAIL_ENABLED, AUTH_EMAIL_HOST, AUTH_EMAIL_PORT, AUTH_EMAIL_USERNAME, AUTH_EMAIL_PASSWORD and AUTH_EMAIL_FROM configure OTP delivery.
- Passwords, tokens and OTP values are never printed.

## Verification

- Configuration check validates required database, port and boolean values.
- Local compose disables auth explicitly only for local development.
- Production starts with AUTH_ENABLED=true.
