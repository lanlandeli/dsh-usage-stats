# Changelog

All notable changes are documented here. This project follows Semantic
Versioning while DeepSeek Harness remains in developer preview.

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
