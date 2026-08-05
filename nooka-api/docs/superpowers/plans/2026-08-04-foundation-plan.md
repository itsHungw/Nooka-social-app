# Nooka API Foundation v1 Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with verification after each boundary change. Do not commit unless requested.

**Goal:** Deliver the maintainable backend foundation approved by the user: full package layout, Spring Modulith/ArchUnit boundaries, centralized errors/security/OpenAPI configuration, and a Docker Compose API service without business endpoints yet.

**Architecture:** Keep feature modules at the first package level (`user`, `spot`, `post`). Publish only named API/query contracts; keep entities and repositories internal. Use explicit `viewerId`, preserve Post visibility as the only read gate, and add provider boundaries only for Firebase/security.

**Tech Stack:** Java 21, Spring Boot 4.1.0, Spring Data JPA, PostgreSQL 17, Flyway, Spring Modulith 2.1.0, ArchUnit 1.4.2, Spring Security + Firebase Admin SDK, Lombok, Docker Compose.

---

### Task 1: Record the approved design

**Files:**
- Create: `nooka-api/docs/superpowers/specs/2026-08-04-foundation-design.md`
- Create: `nooka-api/docs/superpowers/plans/2026-08-04-foundation-plan.md`

- [x] Document the module tree, coupling rules, Lombok policy, and verification gates.
- [x] Keep the design inside `nooka-api/` because the requested change is backend-only.

### Task 2: Add the modularity dependencies

**Files:**
- Modify: `nooka-api/pom.xml`
- Modify: `nooka-api/src/main/java/com/vinhung/nookaapi/NookaApiApplication.java`
- Modify: `nooka-api/src/main/resources/application.yml`

- [ ] Import the Spring Modulith BOM at `2.1.0`.
- [ ] Add `spring-modulith-starter-jdbc` for runtime event infrastructure and `spring-modulith-starter-test` for tests.
- [ ] Add `archunit-junit5` at `1.4.2` for package rules.
- [ ] Add security/OpenAPI dependencies only after compatibility is checked against Boot `4.1.0`.
- [ ] Add `@Modulithic` to the application class.
- [ ] Explicitly configure Flyway-owned Modulith JDBC schema behavior if the dependency is enabled.

### Task 3: Move entities into feature packages

**Files:**
- Move/modify: `nooka-api/src/main/java/com/vinhung/nookaapi/common/BaseEntity.java` → `shared/entity/BaseEntity.java`
- Move/modify: existing `user/*.java` into `user/entity/`
- Move/modify: existing `spot/*.java` into `spot/entity/`
- Move/modify: `post/Post.java` → `post/entity/Post.java`
- Move/modify: `post/Visibility.java` → `post/api/Visibility.java`

- [ ] Update package declarations and imports only; preserve entity mappings and Lombok behavior.
- [ ] Keep `@Data` restricted to composite-key value objects; do not add it to entities.
- [ ] Compile immediately after the move before adding new boundaries.

### Task 4: Create package descriptors and named contracts

**Files:**
- Create: `user/package-info.java`, `user/api/package-info.java`, `user/query/package-info.java`, `user/service/package-info.java`, `user/controller/package-info.java`, `user/dto/package-info.java`
- Create: `spot/package-info.java`, `spot/api/package-info.java`, `spot/service/package-info.java`, `spot/controller/package-info.java`, `spot/dto/package-info.java`
- Create: `post/package-info.java`, `post/api/package-info.java`, `post/service/package-info.java`, `post/controller/package-info.java`, `post/dto/package-info.java`, `post/exception/package-info.java`
- Create: `shared/package-info.java`, `shared/entity/package-info.java`, `shared/error/package-info.java`
- Create: `platform/package-info.java`, `platform/security/package-info.java`, `platform/firebase/package-info.java`, `platform/openapi/package-info.java`
- Create: `user/query/RelationshipCriteria.java`
- Create: `post/api/PostAccess.java`, `post/api/PostCardView.java`, `post/api/PostDetailView.java`

- [ ] Use named interfaces only for contracts actually consumed across modules.
- [ ] Keep future package descriptors empty of classes; do not add `gitkeep`.
- [ ] Keep `api/` free of persistence and Spring stereotype imports.

### Task 5: Refactor the Post read boundary

**Files:**
- Move/modify: `post/PostAccess.java` → `post/repository/JpaPostAccess.java`
- Move/modify: `post/PostRepository.java` → `post/repository/PostRepository.java`
- Move/modify: `post/PostVisibilityRules.java` → `post/repository/PostVisibilityRules.java`
- Create: `post/repository/PostStore.java` only if a write use case needs it; otherwise do not add it.
- Modify: `nooka-api/src/test/java/com/vinhung/nookaapi/post/PostVisibilityRulesTest.java`

- [ ] Make `PostRepository` package-private and keep it inaccessible outside `post.repository`.
- [ ] Make `JpaPostAccess` package-private and implement `post.api.PostAccess`.
- [ ] Preserve the existing visibility predicate and all allow/deny cases.
- [ ] Replace the current entity-returning API contract with a minimal read projection only when the existing tests require it; do not build feed DTOs without an endpoint.
- [ ] Keep all queries prefixed with `PostVisibilityRules.visibleTo(viewerId)`.

### Task 6: Add centralized ProblemDetail handling

**Files:**
- Create: `nooka-api/src/main/java/com/vinhung/nookaapi/shared/error/ApiExceptionHandler.java`
- Create: `nooka-api/src/main/java/com/vinhung/nookaapi/shared/error/ResourceNotFoundException.java`
- Create: `nooka-api/src/test/java/com/vinhung/nookaapi/shared/error/ApiExceptionHandlerTest.java`

- [ ] Map validation and domain errors to RFC 9457 `ProblemDetail`.
- [ ] Avoid stack traces, implementation names, database names, tokens, and Private content in responses.
- [ ] Add only the minimum exceptions needed by the foundation; business-specific exceptions wait for business endpoints.

### Task 7: Add centralized security boundary

**Files:**
- Modify: `nooka-api/pom.xml`
- Create: `user/spi/package-info.java`
- Create: `user/spi/TokenVerifier.java`
- Create: `platform/security/SecurityConfig.java`
- Create: `platform/security/AuthenticatedUser.java`
- Create: `platform/security/TokenAuthenticationFilter.java` only if Spring Security’s resource-server converter cannot carry the internal principal cleanly.
- Create: `platform/firebase/FirebaseTokenVerifier.java` only when its dependency/configuration is verified.
- Create: `nooka-api/src/test/java/com/vinhung/nookaapi/platform/security/SecurityConfigTest.java`

- [ ] Configure production authentication centrally; do not add implicit allow-all behavior.
- [ ] Keep local test bypasses inside test configuration.
- [ ] Do not accept a client-supplied `userId` as the principal.
- [ ] Keep `viewerId` explicit below the security boundary.

### Task 8: Add OpenAPI and Docker runtime foundation

**Files:**
- Modify: `nooka-api/pom.xml`
- Create: `nooka-api/src/main/java/com/vinhung/nookaapi/platform/openapi/OpenApiConfig.java` only if the selected dependency needs explicit config.
- Create: `nooka-api/src/test/java/com/vinhung/nookaapi/platform/openapi/OpenApiSmokeTest.java`
- Create: `nooka-api/Dockerfile`
- Modify: `nooka-api/infra/compose.yaml`
- Modify: `nooka-api/README.md`

- [ ] Keep OpenAPI disabled unless configured, and smoke-test `/v3/api-docs` when enabled.
- [ ] Build the API image from the existing Maven Wrapper output.
- [ ] Make the compose API service depend on PostgreSQL health, use environment-based datasource values, and expose only local ports.
- [ ] Keep credentials out of the image and repository.

### Task 9: Add architecture verification

**Files:**
- Create: `nooka-api/src/test/java/com/vinhung/nookaapi/architecture/ModularityTest.java`
- Create: `nooka-api/src/test/java/com/vinhung/nookaapi/architecture/ArchitectureTest.java`
- Modify: `nooka-api/src/test/java/com/vinhung/nookaapi/post/PostVisibilityRulesTest.java`

- [ ] Verify the Modulith graph with `ApplicationModules.of(NookaApiApplication.class).verify()`.
- [ ] Verify controller → entity/repository is forbidden.
- [ ] Verify only `post.repository` may depend on the PostRepository FQCN.
- [ ] Keep PostgreSQL Testcontainers tests as the source of truth for SQL visibility behavior.

### Task 10: Update durable backend documentation

**Files:**
- Modify: `nooka-api/AGENTS.md`
- Modify: `nooka-api/MEMORY.md`
- Modify: `nooka-api/README.md`

- [ ] Document the final package rules, commands, security prerequisites, and compose services.
- [ ] Replace stale claims that there are no APIs/dependencies only when the implementation actually exists.
- [ ] Do not document secrets or private data.

### Task 11: Verify incrementally and fully

- [ ] Run `mvnw.cmd -q -DskipTests compile` after package migration.
- [ ] Run targeted architecture and error tests.
- [ ] Run the full `mvnw.cmd test` with Docker available.
- [ ] Run `docker compose --env-file .env -f infra/compose.yaml config` and, if Docker is available, `up -d`, healthcheck, and `down`.
- [ ] Inspect `git diff --check` and `git status --short` before handoff.

No commit is created.
