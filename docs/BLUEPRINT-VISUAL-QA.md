# Blueprint visual QA pack (Wave BP)

**Work ref:** `PORTAL-WAVE-BP-OCR-MOBILE` / `PORTAL-WAVE-BP-OCR-DESKTOP` / `PORTAL-WAVE-BP-ONBOARD`  
**OMBC:** `OMBC-20260718-165445-BD189C`  
**Decision:** Operator sign-off required before Wave BP acceptance.

## References

| Blueprint | Preview URL |
|---|---|
| OCR Mobile | https://orthodoxmetrics.com/blueprints/om-ocr-mobile |
| OCR Desktop | https://orthodoxmetrics.com/blueprints/om-ocr-desktop |
| Onboard | https://orthodoxmetrics.com/blueprints/om-onboard |

## Portal surfaces under review

| Surface | Portal URL |
|---|---|
| OCR Mobile | https://orthodoxmetrics.com/portal2/ocr/mobile |
| OCR Desktop | https://orthodoxmetrics.com/portal2/ocr |
| Onboard | https://orthodoxmetrics.com/portal2/onboarding |

## Required captures (operator)

Operator approved without submitting individual capture checkboxes (2026-07-19). Surfaces reviewed: OCR Mobile, OCR Desktop, OM Onboard under `/portal2` vs blueprint previews.

- [x] OCR Mobile — mobile viewport (light) — covered by operator approval
- [x] OCR Mobile — mobile viewport (dark) — covered by operator approval
- [x] OCR Desktop — desktop viewport (light) — covered by operator approval
- [x] OCR Desktop — desktop viewport (dark) — covered by operator approval
- [x] Onboard — desktop viewport (light) — covered by operator approval
- [x] Onboard — mobile viewport (light) — covered by operator approval
- [x] Loading state (at least one OCR flow) — covered by operator approval
- [x] Empty state (OCR history empty / cemetery disabled OK as adjacent) — covered by operator approval
- [x] Error state (failed upload or auth error) — covered by operator approval
- [x] Success state (OCR results / onboard complete) — covered by operator approval

## Review criteria (not pixel-perfect)

Operator approved without submitting individual capture checkboxes; criteria treated as met per operator approval (2026-07-19).

- [x] Step order matches blueprint intent
- [x] Information hierarchy clear
- [x] Primary / secondary actions present
- [x] Responsive behavior acceptable
- [x] Visual density reasonable
- [x] State coverage complete
- [x] No lost functionality vs blueprint
- [x] Intentional deviations documented below

## Intentional deviations

| Area | Deviation | Rationale |
|---|---|---|
| Stack | Mantine + `@om/ui` instead of Tailwind | Stack rewrite mandatory |
| Upload | Live multipart when `AUTH_MODE=live` | Pilot API wiring |
| History | Live jobs when church context present | Pilot API wiring |

## Sign-off

| Field | Value |
|---|---|
| Operator | operator |
| Date | 2026-07-19 |
| Result | APPROVED |
| Notes | OCR Mobile, OCR Desktop, OM Onboard under `/portal2` vs blueprint previews; Wave BP UX accepted. Live OCR APIs remain open for cutover DoD. |
