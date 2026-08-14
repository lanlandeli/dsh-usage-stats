# Compatibility

| Component | Verified | Declared range |
| --- | --- | --- |
| DeepSeek Harness / dsh | `0.1.0-rc.6` | `>=0.1.0-rc.6 <0.2.0` peer APIs |
| Node.js | `24.19.0` locally | `^22.19.0 || >=24.0.0` |
| Web UI | Official `web` profile | Required |
| Themes | Light, dark, system | Supported |
| Desktop wrappers | Same-origin wrappers loading the Web UI | Supported |

DeepSeek Harness is in developer preview and may introduce breaking changes.
The package intentionally relies on a narrow public surface:

- Host: `sessionQuery`, `session/event`, and `webServer`.
- Client: `sidebar.footer.action` and `shell.overlay` slots.
- No selectors, observers, or mutations against Harness-owned DOM.

Every release must pass:

1. Type checking and unit tests.
2. Production build and package-content inspection.
3. Install into a new empty `DSH_HOME`.
4. Configuration composition and Web profile startup.
5. Snapshot API schema check.
6. Removal from the profile without touching Harness packages.

CI covers Node 22.19 and 24. Newer preview releases should be tested before the
declaration is widened.
