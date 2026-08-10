# Nooka Map and Route Preview UX Design

Date: 2026-08-07
Scope: `nooka-mobile/` UI and `nooka-api/` directions provider behavior.

## Goal

Keep users inside Nooka while they inspect a Spot and preview a route. The app shows a polished, native-iOS-inspired map experience without requiring live traffic or background location tracking.

## Experience direction

Use the existing Nooka brand tokens with native iOS interaction patterns:

- Map remains the primary canvas.
- Cards and bottom sheets use clear hierarchy, semantic colors, rounded geometry, and subtle depth.
- Typography follows the existing theme and supports light/dark mode.
- Actions use specific labels and accessible hit targets.
- Motion is calm and interruptible: a sheet uses spring-based snap points, while reduced-motion users receive cross-fade transitions.

## Search map

- Keep the search field as a prominent pill at the top.
- Use horizontally scrollable filter chips below the search field.
- Keep the foreground GPS dot visible while Search is mounted and permission is granted.
- Show a recenter control as a floating circular action near the lower-right map edge.
- Selecting a Spot presents a floating preview card without leaving the map.
- Preserve the existing nearby loading, empty, and error states with inline feedback.

## Spot detail

- Keep the Spot image and identity as the visual anchor.
- Make `Directions` the primary action near the Spot summary.
- Do not navigate immediately to an external maps app.
- Opening Directions presents the route preview sheet over the current Spot/map context.

## Route preview interaction

Use a hybrid sheet:

1. Open at a compact snap point around one-third of the screen.
2. Let the user drag to an expanded snap point around 85% of the screen.
3. Keep the map, destination, and route polyline visible behind the sheet.
4. Use a drag handle, close action, and accessible labels.

The compact sheet contains:

- Drive/Walk segmented control.
- Estimated travel time label.
- Distance.
- Destination name.
- Primary action to keep viewing the preview in Nooka.

The expanded sheet may include route metadata and a secondary `Open in Maps` action. External Apple Maps/Google Maps deep links remain fallback actions, not the primary flow.

## Route data behavior

- Route preview sends one origin snapshot when the user requests Directions.
- The backend does not stream or persist location.
- No live traffic is shown or used.
- `DRIVE` uses a non-traffic routing profile and `WALK` uses a walking profile.
- The mobile contract remains provider-neutral: `distanceMeters`, `durationSeconds`, `encodedPolyline`, and `mode`.
- Mapbox is the first provider candidate for non-traffic Directions; the backend provider port remains the seam for Goong, VietMap, Google, or a self-hosted engine.

## States and accessibility

- Loading: preserve the sheet and show a compact skeleton instead of a full-screen spinner.
- Success: animate the route into view and announce the summary to assistive technology.
- Provider failure: show an inline retry state without discarding the Spot context.
- Location unavailable: explain that route preview needs a current origin and offer a retry/permission path.
- Use semantic theme colors, minimum touch targets, readable contrast, dynamic text sizing where supported, and no information conveyed by color alone.

## Non-goals

- Turn-by-turn navigation inside Nooka.
- Live traffic visualization.
- Background location tracking.
- Location history or periodic backend location updates.
- Replacing the existing map renderer with a native Mapbox map SDK in this pass.

## Success criteria

- A user can search, select a Spot, and preview a route without leaving Nooka.
- The route sheet feels native on iOS while remaining usable on Android.
- Loading and error states preserve context and do not trap the user.
- Provider-specific code remains behind the backend directions boundary.
- Existing mobile lint/type checks and backend tests continue to pass.
