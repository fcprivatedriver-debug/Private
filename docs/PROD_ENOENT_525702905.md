# Production reproduction — www.addandknow.pt

Date: 2026-09-16T22:33:38Z
Production deployment SHA: 39110ea2feaac445806e2d4e657c25e0cd7cbd19
Environment: Production – addynow

## Route / request that fails
- Method: POST
- URL: https://www.addandknow.pt/pt/captura
- Header: Next-Action: 407bdf74d98d03bfedde236e86823da51f524a5004
- Action name: instantCapturePhoto
- Body: multipart FormData with field `file` (JPEG) + `hint`

## Observed response
- HTTP 500
- RSC body contains: 1:E{"digest":"3732487767"} (and later digest 2362605153 on retry)
- x-matched-path: /[locale]/captura
- x-vercel-id examples: cle1::iad1::ntmtb-1789597270497-c648fbe65330 ; cle1::iad1::jd6rd-1789597992257-2d0c15a07514

## Code on that SHA (39110ea)
src/actions/capture.ts instantCapturePhoto → storeFamilyFile
src/lib/storage.ts:
  UPLOAD_ROOT = path.join(process.cwd(), "uploads")
  abs = path.join(UPLOAD_ROOT, "families", familyId, `${Date.now()}-${uuid}-${safeName}`)
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, bytes)

## Exact path pattern
`${process.cwd()}/uploads/families/${familyId}/${timestamp}-${8hex}-${safeFileName}`

On Vercel serverless, process.cwd() is typically `/var/task`, so e.g.:
`/var/task/uploads/families/<familyId>/<timestamp>-<id>-fatura-teste.jpg`

## Why
Vercel app filesystem is read-only (except ephemeral /tmp). Creating/writing under cwd/uploads fails.
User-reported log: ENOENT: no such file or directory (Node may surface ENOENT or EACCES/EROFS depending on mount).
Uncaught exception in Server Action → Application error + Digest.

## Pages that load OK (authenticated familia@nina.app)
/pt/dashboard, /pt/captura, /pt/despesas, /pt/familia — all 200
Failure is on the photo Server Action, not on initial page SSR.

## Correlation with Digests
| Digest | Context |
|--------|---------|
| 525702905 | Latest reported by user (same class) |
| 2807674233 | Prior — ENOENT in Vercel logs |
| 4091516702 | Prior — Application Error on photo |
| 3732487767 | Reproduced live 2026-09-16 via instantCapturePhoto |
| 2362605153 | Reproduced live retry |

Digests are opaque hashes; multiple digests for the same root cause are expected.

## Stack (from production source — first frames of our code)
```
Error: ENOENT/EACCES: ... open/mkdir '/var/task/uploads/families/...'
    at async mkdir (node:internal/fs/promises)
    at async storeFamilyFile (src/lib/storage.ts)
    at async instantCapturePhoto (src/actions/capture.ts)
```
(Full Vercel runtime stack for digest 525702905 requires dashboard access / VERCEL_TOKEN — not available in this agent. Live reproduction confirms the same Server Action path.)
