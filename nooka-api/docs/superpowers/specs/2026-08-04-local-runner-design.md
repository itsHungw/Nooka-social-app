# Local Runner and Custom Auth Design

The runner reads a local dotenv file, maps NOOKA_* values to Spring environment variables, starts PostgreSQL and Redis, waits for health, and launches Maven.

Custom auth is implemented in Spring Boot. It stores BCrypt password hashes, email verification codes, password reset codes, opaque access tokens and rotating refresh sessions in PostgreSQL. SMTP configuration is optional for local startup and required when OTP delivery is enabled.

The mobile client sends access tokens as Authorization: Bearer and stores refresh tokens in secure storage.
