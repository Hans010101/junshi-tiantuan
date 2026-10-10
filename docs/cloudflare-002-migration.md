# Cloudflare 002 migration

Status recorded on 2026-10-10.

- Production Worker: `junshi-tiantuan` in Cloudflare account `a828bebda1f352216c7d7da425bad17a`
- Direct entry: <https://junshi-tiantuan.bitman001.workers.dev>
- Production domains: <https://askjunshi.com> and <https://www.askjunshi.com>
- D1 database: `junshi-tiantuan-db` (`c7c8584e-45f3-4095-bc82-75020d840d05`)
- Runtime bindings: Workers AI, D1, `RESEND_API_KEY`, `EMAIL_SIGNING_SECRET`, and `RESEND_FROM`
- GitHub deployments: `.github/workflows/deploy.yml`; add the target-account API token as the repository secret `CLOUDFLARE_API_TOKEN`

## Verification

- `askjunshi.com` is active in the 002 zone and delegates publicly to `megan.ns.cloudflare.com` and `nero.ns.cloudflare.com`.
- Both the apex and `www` custom domains are enabled on the 002 `junshi-tiantuan` Worker, and their HTTPS certificates are valid.
- Target D1 contains 109 advisors, 763 advisor assets, 451 cases, and 10 domains; foreign-key verification passed.
- The target Worker serves the SPA, manifest, logo, advisor API, portrait assets, and strategy-model images.
- AI advice generation completed through the target Worker. The email endpoint rejected an unsigned request; no test email was sent.
- Public Resend MX, SPF, DKIM, and DMARC records resolve from the 002 authoritative DNS.
- The application has no login or OAuth flow, so there are no login callback URLs to migrate. Browser API calls are same-origin; email submission additionally enforces an exact same-origin check.
- No KV, R2, Queue, Workflow, Durable Object, service binding, or scheduled trigger is used by this project.

## Remaining operations

The public application no longer depends on 007 at runtime. The old 007 zone, custom-domain records, Worker, D1, and workers.dev entry remain only as an inactive rollback backup and must not be removed during the migration retention period.

GitHub validation runs automatically on `main`, but production deployment remains skipped until the target-account token is added as the repository secret `CLOUDFLARE_API_TOKEN`. Local Wrangler deployments already target account 002 and its D1 explicitly, so future publishing has no 007 configuration dependency.
