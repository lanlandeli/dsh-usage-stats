# Privacy and data flow

`dsh-usage-stats` performs usage aggregation on the same machine as DeepSeek
Harness. It does not send telemetry to the package author or any third party.

## Data read

- Session headers: session identifier, creation time, working directory, and
  parent-session relationship.
- Session events: event sequence/time, direct-user vs assistant event type,
  provider/model identifier, and token counters.

## Data not retained

- Prompt or response text.
- Tool names, tool arguments, or tool results.
- API keys, model credentials, environment variables, or file contents.

## Local index

The default index is `DSH_HOME/usage-stats/index-v1.json`. It contains compact
session summaries required to avoid rereading full session logs on every start.
Writes are debounced, atomic, and requested with owner-only file permissions on
platforms that support them. Set `cachePath` to relocate it.

## Browser API

The plugin registers a same-origin endpoint under `/usage-stats/v1`. It accepts
only GET and HEAD and returns aggregate counters. CSV/JSON exports contain dates,
model/provider identifiers, token totals, message totals, and session totals.

## Deletion

Uninstalling the package does not silently delete statistics. Remove
`DSH_HOME/usage-stats` manually if you also want to erase the local index.
