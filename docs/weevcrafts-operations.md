# WeevCrafts installation and recovery

## Resources and source

Fork: https://github.com/WeeVCrafts/FlareMail . Initial upstream revision:
`6328a9e4299daa4a9e6d0e445342db37a871537f` (v1.1.2). Develop and deploy from
`main`; retain upstream license notices. Automatic upstream replacement is off.

Cloudflare account: `fb1c7dea1efaecd445810a8c693c4750`.

| Resource | Replacement |
| --- | --- |
| Worker | `flaremail` |
| Final webmail | `https://inbox.weevcrafts.com` |
| Temporary setup hostname | `https://inbox-next.weevcrafts.com` |
| D1 | `weevcrafts-flaremail`, `fdfdd17c-8135-4376-9d79-3c4aaf689e5f` |
| KV | `weevcrafts-flaremail`, `d4f51c05711a4891bf6ff5ffb265a8a9` |
| Private R2 | `weevcrafts-flaremail-files` |

The private deployment configuration is `apps/worker/wrangler.toml` (ignored).
There is no Cloudflare outbound email binding, AI binding, public R2 domain or
automatic paid upgrade. The initial deployed version was
`969554e6-c05b-4f76-8682-6ee221e2586e`; the current active secret-change
revision is `4261d188-4ad5-4ae4-b949-24826d0e883b`, built from fork commit
`35435bd`. Record subsequent versions in the installation evidence before
calling them deployed.

## Migration state

On 2026-11-07 Cloudflare moved `inbox.weevcrafts.com` from `mailflare` to
`flaremail`. This switches the web interface; incoming email recipient routes
are a separate change. The owner initialized the new database and signed in as
`vinay@weevcrafts.com`. Bhanu and Support must be created as separate member
users, rather than additional mailboxes belonging to Vinay.

Keep the existing three recipient routes on the old Worker until all three new
accounts exist and incoming delivery has been tested. Keep catch-all disabled.
Do not delete the old D1, R2 bucket, queues or backups. No historical mail has
been imported into the new database. The website Reply-To remains
`support@weevcrafts.com`, with sender `no-reply@mail.weevcrafts.com` unchanged.

## Sending and limits

Cloudflare Email Routing receives; Resend Free sends. The root Resend domain
`weevcrafts.com` is verified separately from `mail.weevcrafts.com`; preserve both.
Keep existing MX, SPF, DKIM and DMARC records. Do not switch MX records when a
sending quota is exhausted.

Configure `RESEND_DOMAIN=weevcrafts.com` and a dedicated sending-only
`RESEND_API_KEY` as an encrypted Worker secret. The key is resolved only for that
exact domain, and is never copied into settings responses or D1/KV. Set the
sending provider to Resend and enable sending only after the secret is installed.

Resend's 100 recipients/day and 3,000/month allowances are shared with the
marketplace. Provider rejections must remain visible; do not automatically
resend messages whose acceptance is uncertain, or retry through another provider.
Cloudflare arbitrary external sending requires a paid plan; it is not a free
fallback. Pay-as-you-go must stay disabled. Check Resend Settings > Usage and
Cloudflare Workers, D1, KV and R2 usage regularly. R2 excess usage is billable;
budget alerts are notifications, not spending ceilings.

Register `/api/delivery/resend` for signed delivery events, including `email.sent`.
Store `RESEND_WEBHOOK_SECRET` as an encrypted Worker secret. The handler checks
the signature against the exact bounded request body before storing event data.
The actual RFC Message-ID is retained as the sent event's operational detail,
then reconciled into the sender's message when the provider UUID is persisted.
This handles callbacks arriving before the send response, without a full-access
Resend key or database schema changes. Established IDs cannot be replaced by a
conflicting callback. Callback acceptance is not proof of inbox arrival.

## Backup and rollback

Original DNS and hostname snapshots are under the owner's local
`Documents/Codex/2026-11-07/weevcrafts-mail` evidence directory. The latest
pre-migration encrypted Mailflare snapshot is
`~/.local/share/weevcrafts-mail/backups/2026-11-07T12-13-33-343Z`.
Its isolated restore passed: 48 tables, 10 messages, 12 objects, database
integrity OK, zero production writes. Keep the separate local encryption key
private and backed up independently. The old daily backup timer currently
protects Mailflare only; it does not yet protect FlareMail.

Before retiring the old Worker, configure and demonstrate FlareMail backups
using the upstream `backup:export`, `backup:verify` and `backup:restore` tools.
They cover D1, durable KV preferences and R2 attachments/brand objects, exclude
sessions/caches, and require writers stopped for a consistent export. Restore
only to new isolated resources. Worker secrets need separate secure recovery.
Do not claim replacement backup coverage until an actual isolated restore passes.

A secret-free source profile is prepared at
`~/.config/weevcrafts-mail/flaremail-source.json` (mode 600). The owner must
provide a separately scoped Cloudflare API token and R2 S3 access key/secret as
the environment variables named in that profile, then run from the repository:

```sh
pnpm backup:export --config ~/.config/weevcrafts-mail/flaremail-source.json \
  --out ~/.local/share/weevcrafts-mail/backups/flaremail-<timestamp> --offline
pnpm backup:verify --in ~/.local/share/weevcrafts-mail/backups/flaremail-<timestamp>
```

The restore command must target newly created empty D1/KV/R2 resources and use
`--confirm-target` with that new D1 UUID. Never place these credentials or the
backup archive in Git or in chat.

For a web-interface rollback, reattach `inbox.weevcrafts.com` to `mailflare`
using the recorded hostname binding. If recipient routes have moved, change the
three exact routes back too. Retain all mail received by either deployment;
never overwrite a populated database with an older snapshot. The old private
Wrangler config has had its hostname route removed to prevent accidental
redeployment from reclaiming the replacement's hostname.

## Verification boundaries

Baseline upstream tests passed: 557 Worker tests, 192 web tests. Initial
production build, Wrangler dry run and deployment passed on the existing plan.
The branded build and 36 deployment/backup-tool tests passed subsequently.
The new signed-callback and runtime-secret tests have separate red/green logs.
Record the final full-suite result and deployed source commit after review.

Still required before readiness: private login and foreign-mail/attachment
isolation for all three real users; external delivery in both directions;
first-message reply threading; SPF/DKIM/DMARC and inbox arrival; small attachment;
unknown-recipient rejection; final rendered keyboard/narrow-layout checks;
replacement backup restoration; and current Worker error/limit evidence.

Dependency audit reported 19 high, 14 moderate and 4 low advisories, zero
critical. This count includes build and Node-only paths in web dependencies;
it is not a completed reachability audit or a clean security assessment.
