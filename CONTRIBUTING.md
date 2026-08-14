# Contributing

## Setup

Use Node.js 22.19+ or 24+:

```sh
npm ci
npm run check
```

## Pull requests

- Keep Host code independent of Harness Web UI DOM structure.
- Use public Harness services and UI slots only.
- Update both `README.md` and `README.zh-CN.md` for user-facing behavior.
- Add tests for metric or filtering changes.
- Do not retain event bodies, prompts, responses, tool arguments, credentials,
  or file contents.
- Run `npm run release:check` before requesting review.

## Releases

Update `CHANGELOG.md`, bump the version once, run the clean-profile smoke test,
and publish from a protected tag through npm Trusted Publishing.
