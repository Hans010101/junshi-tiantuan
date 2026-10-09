# Cloudflare 002 migration

Status recorded on 2026-10-10.

- Production Worker: `junshi-tiantuan` in Cloudflare account `a828bebda1f352216c7d7da425bad17a`
- Direct entry: <https://junshi-tiantuan.bitman001.workers.dev>
- Production domains: <https://askjunshi.com> and <https://www.askjunshi.com>
- D1 database: `junshi-tiantuan-db` (`c7c8584e-45f3-4095-bc82-75020d840d05`)
- Runtime bindings: Workers AI, D1, `RESEND_API_KEY`, `EMAIL_SIGNING_SECRET`, and `RESEND_FROM`
- GitHub deployments: `.github/workflows/deploy.yml`; add the target-account API token as the repository secret `CLOUDFLARE_API_TOKEN`

## Verification

- Target D1 contains 109 advisors, 763 advisor assets, 451 cases, and 10 domains; foreign-key verification passed.
- The target Worker serves the SPA, manifest, logo, advisor API, portrait assets, and strategy-model images.
- AI advice generation completed through the target Worker. The email endpoint rejected an unsigned request; no test email was sent.
- No KV, R2, Queue, Workflow, Durable Object, service binding, or scheduled trigger is used by this project.

## Remaining dependency

The registrar still delegates `askjunshi.com` to the 007 account nameservers. Until the registrar nameserver change is completed and propagated, the public domain continues through the 007 DNS zone and its temporary forwarding Worker. The 002 Worker and D1 are already the active application runtime; the old resources must remain as a rollback bridge until DNS cutover is verified.
