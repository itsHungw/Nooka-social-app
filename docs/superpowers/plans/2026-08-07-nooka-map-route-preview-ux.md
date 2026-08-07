# Nooka Map Route Preview UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Keep users inside Nooka with a polished iOS-inspired Search → Spot → non-traffic route-preview flow.

**Architecture:** Keep the mobile contract provider-neutral. Add Mapbox as the first non-traffic Directions adapter on the backend while retaining Google as a configurable fallback. Reuse the existing NookaSheet, react-native-maps, theme tokens, Reanimated, and Gesture Handler; add no dependency and no Mapbox map SDK.

**Tech Stack:** Spring Boot 4.1, Java 21, RestClient, Mapbox Directions REST API, Expo SDK 54, React Native 0.81, Expo Router, react-native-maps, Reanimated 4, Gesture Handler, TypeScript.

---

## File map

### Backend

- Create `nooka-api/src/main/java/com/vinhung/nookaapi/directions/config/MapboxDirectionsProperties.java` for the server-only token and base URL.
- Create `nooka-api/src/main/java/com/vinhung/nookaapi/directions/config/MapboxDirectionsConfiguration.java` for Mapbox beans.
- Create `nooka-api/src/main/java/com/vinhung/nookaapi/directions/integration/MapboxDirectionsProvider.java` for Mapbox HTTP and response normalization.
- Modify `nooka-api/src/main/java/com/vinhung/nookaapi/directions/config/GoogleRoutesConfiguration.java` to qualify its RestClient.
- Modify `nooka-api/src/main/java/com/vinhung/nookaapi/directions/integration/GoogleRoutesProvider.java` to use non-traffic routing.
- Modify `nooka-api/src/main/resources/application.yml` for provider selection and Mapbox configuration.
- Create `nooka-api/src/test/java/com/vinhung/nookaapi/directions/integration/MapboxDirectionsProviderTest.java`.
- Create/update `nooka-api/.env.example` and modify `nooka-api/README.md` for setup.

### Mobile

- Create `nooka-mobile/components/nooka/route-preview-sheet.tsx` for the full-screen map backdrop and hybrid sheet.
- Modify `nooka-mobile/components/nooka/direction-preview.tsx` or remove its duplicated layout after moving its responsibility.
- Modify `nooka-mobile/app/spot/[id].tsx` to render the route sheet as an overlay.
- Modify `nooka-mobile/app/(tabs)/search.tsx` for search pill, filter rail, selected Spot preview, recenter affordance, and sheet spacing.
- Modify `nooka-mobile/components/nooka/bottom-sheet.tsx` only for required accessibility/reduced-motion behavior.
- Modify `nooka-mobile/locales/en.json` and `nooka-mobile/locales/vi.json` for route states and labels.
- Modify `nooka-mobile/constants/theme.ts` only for missing semantic tokens.
- Create/update `nooka-mobile/.env.example` with public mobile configuration only.

## Task 1: Lock provider configuration and non-traffic behavior

**Files:** `nooka-api/src/main/resources/application.yml`, `nooka-api/src/main/java/com/vinhung/nookaapi/directions/integration/GoogleRoutesProvider.java`, `nooka-api/.env.example`, `nooka-api/README.md`.

- [ ] **Step 1: Bind provider configuration.** Add `DIRECTIONS_PROVIDER` with default `mapbox`, `MAPBOX_ACCESS_TOKEN`, `MAPBOX_DIRECTIONS_BASE_URL`, and preserve the existing Google environment variables.
- [ ] **Step 2: Make Google fallback non-traffic.** Replace `TRAFFIC_AWARE` with `TRAFFIC_UNAWARE` for `DRIVE`, or omit the preference; do not send live traffic routing.
- [ ] **Step 3: Document secrets and runtime behavior.** Put the Mapbox token only in `nooka-api/.env`; mobile sends one origin snapshot when the user taps Directions and the backend does not persist location.

## Task 2: Add the Mapbox Directions adapter

**Files:** `nooka-api/src/main/java/com/vinhung/nookaapi/directions/config/MapboxDirectionsProperties.java`, `nooka-api/src/main/java/com/vinhung/nookaapi/directions/config/MapboxDirectionsConfiguration.java`, `nooka-api/src/main/java/com/vinhung/nookaapi/directions/integration/MapboxDirectionsProvider.java`, `nooka-api/src/main/java/com/vinhung/nookaapi/directions/config/GoogleRoutesConfiguration.java`, `nooka-api/src/test/java/com/vinhung/nookaapi/directions/integration/MapboxDirectionsProviderTest.java`.

- [ ] **Step 1: Write the failing provider test.** Use `MockRestServiceServer` and assert `GET /directions/v5/mapbox/driving/106.7009,10.7769;106.699,10.7806` with `overview=full`, `geometries=polyline`, and `access_token=test-token`; return a JSON route with distance `1200.5`, duration `180.0`, and geometry, then assert normalized values `1201`, `180`, and the geometry string.
- [ ] **Step 2: Add failure cases.** Assert a missing token, non-`Ok` response, and empty routes list produce the existing HTTP 503 behavior.
- [ ] **Step 3: Run the test before implementation.** From `nooka-api`, run `./mvnw.cmd -Dtest=MapboxDirectionsProviderTest test`; expected result is a compilation/test failure because the provider does not exist yet.
- [ ] **Step 4: Implement properties and configuration.** Bind `nooka.directions.mapbox` with `MapboxDirectionsProperties(String accessToken, String baseUrl)`, expose a qualified `mapboxDirectionsRestClient`, and qualify the existing Google RestClient so both providers coexist.
- [ ] **Step 5: Implement the adapter.** Implement `DirectionsProvider` with id `mapbox`; use profile `driving` or `walking`, send longitude before latitude, request `overview=full&geometries=polyline`, read `routes[0].distance`, `duration`, and `geometry`, round numeric values to `long`, and return `DirectionsProvider.RouteData`.
- [ ] **Step 6: Run focused tests and compile.** Run `./mvnw.cmd -Dtest=MapboxDirectionsProviderTest,RoutePreviewServiceTest test` and `./mvnw.cmd -DskipTests compile`; both must pass.

## Task 3: Build the hybrid route-preview sheet

**Files:** `nooka-mobile/components/nooka/route-preview-sheet.tsx`, `nooka-mobile/components/nooka/direction-preview.tsx`, `nooka-mobile/components/nooka/bottom-sheet.tsx` if required, `nooka-mobile/locales/en.json`, `nooka-mobile/locales/vi.json`.

- [ ] **Step 1: Define the controlled component contract.** Accept `visible`, `spotName`, `destination`, `origin`, `route`, `loading`, `error`, `mode`, `onClose`, `onModeChange`, `onRetry`, and `onOpenMaps`, using existing `Coordinate`, `RoutePreview`, and `TravelMode` types.
- [ ] **Step 2: Implement the map backdrop.** Render a full-screen `MapView` using `nookaMapStyle`, destination marker, optional blue origin marker, decoded route Polyline, and `fitToCoordinates`; do not add another location watcher.
- [ ] **Step 3: Implement two snap points.** Reuse `NookaSheet` with compact and expanded heights derived from window dimensions and safe-area insets. Compact content shows destination, Drive/Walk, distance, ETA, and the in-app action. Expanded content adds route context, the non-traffic label, retry state, and the secondary external-map action.
- [ ] **Step 4: Add iOS interaction details.** Use semantic theme colors, 44pt-or-larger controls, accessibility roles/labels, a close action, and the existing Reanimated spring behavior without decorative motion that conflicts with reduced motion.
- [ ] **Step 5: Add localized copy.** Add English/Vietnamese keys for estimated ETA, normal conditions, close, retry, loading, unavailable, origin unavailable, and mode labels. Never show raw provider errors.

## Task 4: Integrate Spot detail without leaving Nooka

**Files:** `nooka-mobile/app/spot/[id].tsx`, `nooka-mobile/features/nooka/directions-api.ts` only if typed errors are needed.

- [ ] **Step 1: Replace the inline route card.** Keep route state in `SpotScreen`, render `RoutePreviewSheet` as an overlay when `showRoute` is true, and remove the old inline route card from the scroll body.
- [ ] **Step 2: Preserve one-origin semantics.** Call `getForegroundLocation()` once on first open; reuse `routeOrigin` on mode changes; retry may request location only after an origin failure.
- [ ] **Step 3: Wire lifecycle and actions.** Directions opens the sheet and loads the route; close hides transient route UI; retry reuses the current origin; external deep links remain secondary.
- [ ] **Step 4: Verify states.** Check opening, loading, success, mode switch, provider failure, permission failure, close, and reopening the same Spot.

## Task 5: Polish Search map UX

**Files:** `nooka-mobile/app/(tabs)/search.tsx`, `nooka-mobile/components/nooka/nooka-map.tsx` only for required padding/selection affordances, `nooka-mobile/components/nooka/bottom-sheet.tsx` only for semantics, and `nooka-mobile/constants/theme.ts` only for missing tokens.

- [ ] **Step 1: Preserve data flow.** Do not change nearby-place fetching, bucketed GPS updates, or the no-background-tracking rule; keep `NookaSheet` for the list and selected Spot.
- [ ] **Step 2: Refine controls and selection.** Keep the search field as an iOS-style pill, keep filter chips horizontally scrollable, make selected Spot hierarchy clear, and keep the primary action opening Spot detail.
- [ ] **Step 3: Refine recenter and map padding.** Position the recenter FAB from active sheet height and safe-area insets; use theme tokens for light and dark mode.
- [ ] **Step 4: Verify Search states.** Check loading, error, empty, nearby results, selected Spot, map tap-to-dismiss, recenter, light mode, dark mode, and larger text.

## Task 6: Validate and document

**Files:** `nooka-mobile/.env.example`, `nooka-mobile/README.md` if env setup is documented there.

- [ ] **Step 1: Document mobile-safe env values.** Add only `EXPO_PUBLIC_API_URL=http://localhost:8080`; state that `MAPBOX_ACCESS_TOKEN` belongs only in `nooka-api/.env`.
- [ ] **Step 2: Run mobile checks.** From `nooka-mobile`, run `node --test features/nooka/geo-polyline.test.ts`, `npm run lint`, and `npx tsc --noEmit`; expected result is all pass without upgrading Expo SDK 54 or adding dependencies.
- [ ] **Step 3: Run backend checks.** From `nooka-api`, run `./mvnw.cmd -Dtest=MapboxDirectionsProviderTest,RoutePreviewServiceTest test` and `./mvnw.cmd -DskipTests compile`; expected result is focused tests and compile pass.
- [ ] **Step 4: Review the final diff.** Run `git diff --check` and `git status --short`; confirm no secret values, generated files, commits, branches, or unrelated refactors were added.

## Self-review

- Spec coverage: Search polish is Task 5; Spot hybrid sheet is Tasks 3–4; non-traffic provider behavior is Tasks 1–2; accessibility, states, and localization are Tasks 3 and 5; no tracking/background behavior is preserved in Tasks 3–5; validation is Task 6.
- Self-review: no unresolved filler text or unspecified error-handling steps remain.
- Type consistency: the sheet consumes existing `RoutePreview`, `TravelMode`, and `Coordinate`; backend output remains `DirectionsProvider.RouteData`.
- Repository constraints: no new dependency, no SDK upgrade, no persistence, no mobile secret, and no commit because repository instructions prohibit commits unless requested.
