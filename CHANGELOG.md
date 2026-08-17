# Changelog

All notable changes are documented here. This project follows Semantic
Versioning while DeepSeek Harness remains in developer preview.

## [Unreleased]

### Added

- Added a "Call Details" panel to the dashboard: a paginated per-call list
  showing end-to-end response time, input/output tokens, cache hit rate, model,
  and reasoning effort for every assistant call.
- Added the `GET /usage-stats/v1/calls` endpoint with date, scope, workspace,
  model, provider, input/output token-threshold, and pagination filters.
- Collected `durationMs` (step/start → assistant/message) and `effort`
  (request/header reasoning effort) per call, keyed per session so concurrent
  sessions never bleed timing into each other.

### Changed

- Rebuild schema-2 caches as schema 3 so historical call timing and reasoning
  effort are populated instead of remaining blank after upgrade.
- Reused filtered, time-sorted call results across pages and debounced numeric
  filters to avoid repeated full-history work during ordinary navigation.
- Preserved the existing public `appendActivity(summary, event, indexedAt)`
  signature while accepting collector state as an optional fourth argument.
- Added responsive wrapping for the call-detail toolbar.
- Persisted the latest request-header reasoning effort across subsequent calls,
  rebuilt existing call indexes, matched call filters to the workspace selector,
  remembered the selected page size (20 by default), and inherited the Harness
  font stack throughout the dashboard.
- Refined call details with aligned numeric columns, localized effort labels,
  sticky headers, exact-value hints, token-suffixed filters, contextual reset,
  and compact range pagination.
- Balanced call-detail columns with a fixed layout and rounded inset row hover.
- Kept row corner geometry stable while hover color fades out.
- Unified all call-detail columns on a shared left-aligned reading edge.
- Distributed all seven call-detail columns evenly across the available width.

## [0.1.15] - 2026-08-15

### Added

- Added Chinese and English dashboard copy that follows the Harness language
  setting without introducing a separate plugin preference.
- Registered and disposed locale dictionaries through the Harness locale
  lifecycle so plugin reloads do not leave duplicate registrations behind.

Thanks to [@yzke](https://github.com/yzke) for proposing the localization work
in [#2](https://github.com/lanlandeli/dsh-usage-stats/pull/2).

## [0.1.14] - 2026-08-15

### Changed

- Moved the inherited-subtask-context correction out of the feature table and
  into a dedicated fixed-issues section in both README files.

## [0.1.13] - 2026-08-15

### Fixed

- Excluded the parent-session prefix inherited by forked subtasks while keeping
  all usage produced by the child across later resume lifecycles.
- Invalidated schema-1 caches so previously inflated child summaries are rebuilt.
- Added regression coverage for repeated seed markers, repeated subagent
  descriptors, zero-seed children, legacy child headers, root sessions, and
  schema-1 cache invalidation/rebuild.

Thanks to [@Grivn](https://github.com/Grivn) for reporting the inherited-seed
double counting in [#1](https://github.com/lanlandeli/dsh-usage-stats/pull/1).

## [0.1.12] - 2026-08-14

### Changed

- Reworked the Chinese and English README files with a concise feature overview,
  installation instructions, troubleshooting guidance, and anonymous examples.
- Replaced preview assets with a smoother light-theme demo and complete anonymous
  light/dark screenshots.
- Aligned privacy, security, compatibility, and development documents with the
  current plugin behavior and Chinese-first documentation.

## [0.1.11] - 2026-08-14

### Fixed

- Added safe horizontal chart insets so the first and last date labels are not
  clipped at panel boundaries in light or dark mode.

## [0.1.10] - 2026-08-14

### Changed

- Reworked the public project description around concrete dashboard features.
- Improved npm search keywords for analytics and data visualization.

## [0.1.9] - 2026-08-14

### Added

- Local incremental usage index and lifetime overview metrics.
- 7/30-day stacked token trends and one-year activity heatmap.
- Per-model hover details, workspace/task filters, and CSV/JSON export.
- Responsive light/dark UI through official Harness UI slots.
- Clean-profile lifecycle smoke test and Node compatibility CI.

### Security and privacy

- The HTTP endpoint is same-origin, aggregate-only, and GET/HEAD-only.
- Prompt text, response text, tool arguments, and API keys are not indexed.
- Cache writes are atomic and use owner-only permissions where supported.
