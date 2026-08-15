# Changelog

All notable changes are documented here. This project follows Semantic
Versioning while DeepSeek Harness remains in developer preview.

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
