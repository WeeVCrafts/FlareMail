# Focused migration security review

This is a focused source review of the migration changes, not a full repository
security scan. Keep personal passwords out of chat, scripts and test fixtures.
Only the owner enters and submits real new passwords in the browser. Synthetic
test credentials are confined to isolated test databases.

| Attacker-controlled source | Sensitive sink | Boundary and failure behavior |
| --- | --- | --- |
| Unauthenticated delivery body and Svix headers | D1 delivery events and sent Message-ID | `api/mail-delivery-api.js` caps the body at 64 KiB and rate-limits callbacks. `service/mail-delivery-service.js` verifies the exact body signature before parsing trusted event fields; bounds headers, time, recipients and operational details; malformed RFC IDs never reach the message header field. Tests cover altered signatures and early/conflicting callbacks. |
| Signed callback provider UUID | Another user's sent mail | Reconciliation requires the stored UUID, provider `resend`, sent-message type and non-saving status; it only fills an empty Message-ID. It never uses a browser-supplied user or mailbox identifier to select a target. Existing authenticated delivery history queries require the session user's owned account. |
| Browser sender account ID or reply email ID | Provider send and another user's attachments/mail | Existing `email-service.js` resolves the sender through `selectOwnedById`, checks active managed domain authority, and selects replies with the session user ID. Existing tests exercise foreign-account and attachment boundaries. Real multi-user production checks remain required. |
| Requested sending domain | Encrypted Resend key | `resolveResendToken` requires exact equality with `RESEND_DOMAIN`. No implicit domain inference; other domains retain their separately configured keys. Diagnostics expose only a Boolean. Tests cover unrelated/missing domains. |
| Member settings request | Runtime secrets, users and provider administration | Existing server admin checks, same-origin checks and recent authentication remain in place. The callback Worker secret cannot be overwritten or cleared through the database settings UI. |

Secrets live in Cloudflare encrypted Worker secrets. The installation credential
is separately stored in an owner-only local file. The deployment OAuth token
remains in the existing Wrangler mode-600 configuration; it is not a runtime
credential. Never commit secrets or print them in diagnostic logs.

Only the public hostname binding has moved at this checkpoint. Keeping receiving
routes on the old Worker until replacement users exist avoids rejection and
preserves incoming mail. Retain old encrypted backups and all storage through
cutover. Resend and Worker quotas are shared-resource availability risks; a
failed/uncertain send must not trigger an automatic second send or paid upgrade.
