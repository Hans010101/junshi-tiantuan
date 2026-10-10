# Cloudflare 002 migration

Status recorded on 2026-10-10.

- Production Worker: `junshi-tiantuan` in Cloudflare account `a828bebda1f352216c7d7da425bad17a`
- Direct entry: <https://junshi-tiantuan.bitman001.workers.dev>
- Production domains: <https://askjunshi.com> and <https://www.askjunshi.com>
- D1 database: `junshi-tiantuan-db` (`c7c8584e-45f3-4095-bc82-75020d840d05`)
- Runtime bindings: Workers AI, D1, `RESEND_API_KEY`, `EMAIL_SIGNING_SECRET`, and `RESEND_FROM`
- GitHub deployments: `.github/workflows/deploy.yml` with the target-account repository secret `CLOUDFLARE_API_TOKEN`

## Verification

- `askjunshi.com` is active in the 002 zone and delegates publicly to `megan.ns.cloudflare.com` and `nero.ns.cloudflare.com`.
- Both the apex and `www` custom domains are enabled on the 002 `junshi-tiantuan` Worker, and their HTTPS certificates are valid.
- Target D1 contains 109 advisors, 763 advisor assets, 451 cases, and 10 domains; foreign-key verification passed.
- The target Worker serves the SPA, manifest, logo, advisor API, portrait assets, and strategy-model images.
- AI advice generation completed through the target Worker. The email endpoint rejected an unsigned request; no test email was sent.
- Public Resend MX, SPF, DKIM, and DMARC records resolve from the 002 authoritative DNS.
- The application has no login or OAuth flow, so there are no login callback URLs to migrate. Browser API calls are same-origin; email submission additionally enforces an exact same-origin check.
- No KV, R2, Queue, Workflow, Durable Object, service binding, or scheduled trigger is used by this project.
- GitHub Actions run `38011542870` completed a real 002 deployment on 2026-10-10; the Deploy step ran, the skip step did not, and Wrangler created Worker version `d35f2542-54f3-49ff-b8fd-ad5de445218d` with both custom domains.

## 007 deletion-readiness audit

- A read-only scan covered all 6 application tables and 48 text fields in the live 002 D1 database. None of the 17 checked 007 account IDs, old database IDs, workers.dev hosts, or retired Pages hosts appeared in stored configuration, knowledge content, cases, asset metadata, or email records.
- The public advisor list returns 109 advisors. Asset inventory is complete: 109 portraits, 109 thumbnails, and 545 strategy cards.
- All 763 available image references were checked against `askjunshi.com`: every request returned HTTP 200 with an image content type, with no failures or redirects. Runtime asset URLs therefore resolve from the current Worker assets rather than 007 storage.
- Knowledge profiles and model-image paths are returned from the 002 D1-backed advisor detail API. Stored text and dynamic resource metadata contain no identified 007 dependency.
- The deployed Worker has the 002 Workers AI binding `AI` and uses the Cloudflare Qwen model through that binding; no external model API credential is required by this project. Binding presence was verified without running another paid inference.
- The default local Wrangler OAuth now resolves to Cloudflare account 002. The 007 OAuth copy is retained only in the restricted migration backup for rollback and is not part of normal deployment.

Local evidence:

- `/Users/hans.pan/Library/Application Support/Dianjinshou/migration-002-20261009/002-deletion-junshi-db-scan-20261010.json`
- `/Users/hans.pan/Library/Application Support/Dianjinshou/migration-002-20261009/002-deletion-junshi-images-20261010.json`

## Current runtime dependencies

- Cloudflare 002: Worker static assets and API runtime, D1, Workers AI, DNS, TLS, and custom-domain routing.
- GitHub: repository source, Actions workflow, and the scoped 002 deployment token.
- Resend: report-email delivery only. Core browsing, advisor data, report generation, and PDF download do not require Resend.
- User report history is browser-local and is not a Cloudflare database dependency.

## Verification boundaries

- Image checks verified availability and media type, not byte-for-byte hashes or visual decoding of every image.
- Workers AI binding and a prior successful inference are verified, but this audit intentionally did not consume another inference; future model availability and account quota remain Cloudflare operational dependencies.
- No real email was sent, so Resend delivery to a recipient inbox was not re-proven in this audit.
- 106 advisor knowledge profiles remain marked as pending knowledge-quality review. This is a content-quality state, not a 007 migration dependency.

## Remaining operations

The public application and its publishing path no longer depend on 007. The old 007 zone, custom-domain records, Worker, D1, and workers.dev entry remain only as an inactive rollback backup and must not be removed during the migration retention period.

GitHub now validates and deploys automatically on `main`; manual dispatch is also available. The scoped 002 deployment token expires on 2027-10-10 and must be rotated before then. Local Wrangler deployments and the default Wrangler account also target 002 and its D1 explicitly.
