# Nooka API Foundation v1

**Status:** Approved by the user for implementation.

**Goal:** Build a maintainable backend foundation with explicit feature boundaries, minimal coupling, and no empty scaffolding.

## Architecture

```text
com.vinhung.nookaapi
├── shared/       BaseEntity and cross-cutting error contract
├── user/         Account and relationship data
├── spot/         City, Area, Spot, Place, Experience
├── post/         Post, visibility policy, read boundary
└── platform/     Spring Security, custom auth Admin and OpenAPI adapters
```

`user`, `spot`, and `post` are Spring Modulith application modules. `platform` contains adapters only. `media`, `notification`, `moderation`, `feed`, and `search` are not created until they have a real use case.

## Coupling rules

- Package by feature; do not create repository/service/controller top-level buckets.
- `api/` contains public records/interfaces only; never entities, repositories, JPA Criteria, or Spring stereotypes.
- Create an interface only for a module boundary, a query boundary, or an external provider port. No interface for a one-implementation internal service.
- Repository implementations and visibility adapters remain package-private.
- Synchronous reads/validation cross modules through named `api` contracts; cross-module writes use events.
- `viewerId` is an explicit argument to Post use cases and access queries; service/repository code does not read `SecurityContextHolder`.
- Controllers never return JPA entities. Post reads go through `post.api.PostAccess`, and every Post query starts with the visibility policy.
- `shared` is the single location for genuinely shared primitives and global HTTP error handling.

## Package layout

```text
shared/
  entity/BaseEntity.java
  error/ApiExceptionHandler.java

user/
  api/                 public user contracts
  query/               RelationshipCriteria named interface
  entity/              User, Follow, CloseFriend, Block
  repository/          JPA repositories and adapters

spot/
  api/                 public spot contracts
  entity/              City, Area, Spot, Place, Experience
  repository/

post/
  api/                 PostAccess and safe read views
  entity/              Post
  repository/          PostRepository, visibility rules, access adapter

platform/
  security/            SecurityFilterChain and principal boundary
  auth/            Token adapter boundary
  openapi/              OpenAPI configuration
```

No `gitkeep` files and no empty package are added. A package appears only with a class that has a current responsibility or a package descriptor required by the module contract.

## Runtime foundation

1. Add Spring Modulith JDBC runtime and test support, plus ArchUnit tests.
2. Annotate the application for Modulith and declare named interfaces for real cross-module contracts.
3. Move existing classes to the feature package layout and preserve current Post visibility behavior.
4. Add one global RFC 9457 `ProblemDetail` handler. Do not expose stack traces, class names, table names, tokens, or Private content.
5. Add a centralized Spring Security boundary for opaque bearer session token. Production is never implicitly allow-all; local test bypasses are test-only configuration.
6. Add OpenAPI configuration behind an explicit property and verify `/v3/api-docs` with a smoke test.
7. Extend the existing PostgreSQL compose setup with an API service and healthcheck; secrets remain environment-provided.

## Lombok policy

Use `@Getter`, `@Builder`, `@RequiredArgsConstructor`, and protected no-args constructors where they reduce real boilerplate. Do not use `@Data` or generated equality on entities extending `BaseEntity`; do not use Lombok to hide an unnecessary abstraction.

## Verification

- `ModularityTest` verifies the Modulith graph.
- `ArchitectureTest` verifies controller/entity/repository boundaries and prevents PostRepository bypass.
- Existing PostgreSQL/Testcontainers context and visibility tests remain green.
- HTTP errors have stable status and ProblemDetail shape.
- OpenAPI JSON smoke test runs when documentation is enabled.
- Compose starts PostgreSQL and the API health endpoint.

Business endpoints are deliberately not included in Foundation v1. The next slice can add them on top of these boundaries without importing persistence details across modules.
