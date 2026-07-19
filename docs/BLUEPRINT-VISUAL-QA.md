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

- [ ] OCR Mobile — mobile viewport (light)
- [ ] OCR Mobile — mobile viewport (dark)
- [ ] OCR Desktop — desktop viewport (light)
- [ ] OCR Desktop — desktop viewport (dark)
- [ ] Onboard — desktop viewport (light)
- [ ] Onboard — mobile viewport (light)
- [ ] Loading state (at least one OCR flow)
- [ ] Empty state (OCR history empty / cemetery disabled OK as adjacent)
- [ ] Error state (failed upload or auth error)
- [ ] Success state (OCR results / onboard complete)

## Review criteria (not pixel-perfect)

- [ ] Step order matches blueprint intent
- [ ] Information hierarchy clear
- [ ] Primary / secondary actions present
- [ ] Responsive behavior acceptable
- [ ] Visual density reasonable
- [ ] State coverage complete
- [ ] No lost functionality vs blueprint
- [ ] Intentional deviations documented below

## Intentional deviations

| Area | Deviation | Rationale |
|---|---|---|
| Stack | Mantine + `@om/ui` instead of Tailwind | Stack rewrite mandatory |
| Upload | Live multipart when `AUTH_MODE=live` | Pilot API wiring |
| History | Live jobs when church context present | Pilot API wiring |

## Sign-off

| Field | Value |
|---|---|
| Operator | |
| Date | |
| Result | APPROVED / APPROVED WITH DEVIATIONS / REJECTED |
| Notes | |
