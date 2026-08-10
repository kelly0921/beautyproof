# Proof Campaign model

## Transaction change

Traditional beauty acquisition buys attention. The consumer then bears the cost and uncertainty of discovering whether the marketed formula fits them.

BeautyProof lets a brand identify an evidence gap for an exact formula, claim, and starting raw-score range. The brand funds protocol completion through a Proof Campaign. A qualifying consumer completes a sponsored ProofWindow and earns an outcome-neutral prototype reward. The resulting ProofReceipt becomes reusable campaign evidence.

**Brands pay for proof, not praise.** `keep`, `swap`, `return`, `pause`, `continue`, and `inconclusive` are all valid outcomes and earn the same reward after valid completion.

## Hero campaign

- Brand: Aster Vale
- Product: DewSignal Adaptive Serum
- Formula: 2026 US Formula
- Claim: Visible hydration in 14 days
- Eligibility metric: `hd_moisture` raw score at 60 or below
- Target: 25 completed ProofReceipts
- Reward: $15 Aster Vale store credit
- Ledger: prototype only; no funds moved

## Consent boundaries

Campaign participation discloses that de-identified campaign-level outcomes update Campaign Proof Coverage. That participation is required for enrollment and reward eligibility.

Broader shopper ProofMap aggregation is a separate, optional action after receipt creation. It has no effect on eligibility, completion, or reward status.

## Data origins

Campaign coverage combines deterministic synthetic scale receipts with completed campaign-linked receipts. Verified live or cached YouCam receipts count as real evidence. The designated simulated fixture can exercise the judge flow and prototype reward, but its receipt remains synthetic; arbitrary synthetic analyses cannot enroll. Counts remain separated by origin.

Measurement provenance and protocol provenance are separate. Live YouCam baseline and follow-up tasks demonstrate the working integration, but using the labeled Day 14 time jump forces the resulting receipt to remain synthetic. A real receipt requires verified analysis provenance and an actually elapsed observation window.

Images are not stored. BeautyProof retains only minimum numeric observations, YouCam provenance, validity metadata, and the records required to operate the ProofWindow and receipt.

## What this is not

- Not medical diagnosis or treatment guidance
- Not a clinical trial
- Not scientific efficacy verification
- Not evidence that the product caused an observed change
- Not demographic, identity, attractiveness, or “skin twin” matching
- Not real reward issuance or money movement
- Not the future Proof Capital financing model

Proof Capital—pre-funding cohort acquisition in exchange for capped revenue participation—is roadmap context only and is not implemented in this hackathon prototype.

## Runtime flow

1. Brand activates a claim-supported Proof Campaign.
2. Consumer consents to cosmetic YouCam analysis.
3. Eligibility evaluates campaign status, exact formula/claim, analysis validity and origin, configured raw-score ranges, and trial readiness.
4. Enrollment creates one pending prototype reward entry.
5. A ProofWindow is linked to the enrollment.
6. Receipt persistence completes the enrollment and earns the reward for every valid verdict.
7. Campaign coverage includes the completed receipt immediately.
8. Shopper ProofMap aggregation occurs only after separate receipt consent.

Completion, receipt storage, enrollment completion, and reward earning are idempotent.
