# Security and privacy

The default deployment serves one trusted local user. It is not a public,
authenticated multi-user service. Loopback binding plus Host and Origin validation
reduce exposure to other websites and DNS rebinding. A reverse proxy with HTTPS
and authentication is required when deliberately enabling remote access.

## Controls implemented

- One HTTP/WebSocket origin, explicit origin/host allowlists, no permissive CORS.
- Restrictive Content Security Policy, no external fonts/scripts, no frame embedding.
- Text is rendered with `textContent`, never HTML. Static paths are confined to
  public assets or language files; dotfiles and unknown extensions are rejected.
- WebSocket payload, client count, outbound buffers, heartbeat and retry limits.
- Tracker token comparison uses constant-time comparison; non-loopback binding
  requires a sufficiently long token. Camera hardware is not public-facing.
- Default containers use non-root users, no Linux capabilities, read-only roots,
  bounded process/memory limits and loopback published ports. Camera access is a
  separate Linux override with one explicit device.
- No cloud text suggestions, conversation logs, camera recordings or persisted
  messages. Preferences only are kept in browser storage; audio stays in memory.
- Local neural speech uses bounded input/output, a fixed endpoint, an allowlist,
  a timeout, no redirects and one active request. Model paths never come from the UI.
- Versioned model download with SHA-256 verification. Third-party voice downloads
  remain an explicit installation step with separate license/provenance review.
- CI runs production-code tests and audits; it never rewrites tests or dependencies.

Origin checks do not authenticate local processes. A compromised local account,
trusted model/library path, browser extension or speech engine is outside this
application's protection. Piper has its own network boundary and should remain
loopback-only or isolated inside a private container network. Device voice engines
are trusted installed components; the app only selects voices marked local.

## Dependency maintenance

Run `npm audit --prefix za-frontend`, and `pip-audit -r` against each installed
Python requirement set. Run a container scanner before publishing an image, because
base-image packages have their own update cycle. A clean audit means no known
advisories in that database at that time; it is not proof of absence of vulnerabilities.
The old duplicate packages and unsupported AI SDK were removed, eliminating their
separate unmaintained dependency trees. Dependabot alerts on the default branch
remain open until reviewed PRs are merged and GitHub re-evaluates that branch.

Never commit `.env`, model binaries, personal phrases, clinical information, camera
images or private text in bug reports. Security reports should contain a minimal
reproduction with synthetic data. Use the repository's private security reporting
feature if enabled; otherwise contact a maintainer privately before publishing
exploit details. Do not include credentials in a public issue.
