# Aarogya360 Portal User Guide (All Roles)

Last updated: March 18, 2026 (local)
Source of truth: active backend/frontend implementation in this repository.

## 1) Product Roles Covered

1. Administrator (`ADMIN`)
2. Primary Doctor (`DOCTOR`)
3. Specialist (`SPECIALIST`)
4. Patient (`PATIENT`)
5. Family Member (`FAMILY_MEMBER`)
6. AI assistant surface (service-driven, no direct login role)

## 2) Shared Basics (All Logged-in Users)

1. Login from `/portal/login`.
2. Sidebar navigation is role-scoped.
3. `Help` page is available at `/portal/help` for role capabilities and workflow guidance.
4. All operations are organization-scoped; cross-organization access is blocked.

## 3) Administrator Guide

Primary screens:
- `/portal/admin` (overview)
- `/portal/admin/patients`
- `/portal/admin/leads`
- `/portal/admin/users`

Typical workflow:
1. Create users (doctor/specialist/patient/family/admin).
2. Create patient intake record and profile details.
3. Assign primary doctor and specialist.
4. Monitor operations in overview and leads.
5. Review family consent/audit from patient context.

What admin can do:
- User role and suspension management.
- Patient lifecycle and care-team assignment.
- Lead pipeline management.

## 4) Doctor Guide

Primary screens:
- `/portal/doctor`
- `/portal/doctor/caseload`
- `/portal/doctor/patient/:patientId`

Typical workflow:
1. Open caseload and select patient.
2. Update lifecycle stage.
3. Create clinical event/order/referral as needed.
4. Upload report image/PDF directly (mobile camera supported).
5. Invite family from patient context for consent workflow.

What doctor can do:
- Full clinical workflow updates in doctor scope.
- Specialist assignment in referral/order flow.
- Family invitation and grant visibility.

## 5) Specialist Guide

Primary screens:
- `/portal/specialist`
- `/portal/specialist/caseload`
- `/portal/specialist/patient/:patientId`

Typical workflow:
1. Claim from specialist pool or work assigned referrals.
2. Select patient from specialist queue.
3. Update referral and order statuses.
4. Log specialist events and upload specialist reports.
5. Review full patient detail and timeline before escalation.

What specialist can do:
- Specialist queue execution and status updates.
- Patient-context report upload and event logging.

## 6) Patient Guide

Primary screens:
- `/portal/patient`
- `/portal/patient/family-access`

Typical workflow:
1. Review stage and timeline.
2. Upload personal report photo/PDF.
3. Approve/reject family access invites.
4. Grant/revoke family access directly.
5. Track family access audit history.

What patient can do:
- Self-service document upload/download.
- Consent decisions for family invitations.

## 7) Family Member Guide

Primary screens:
- `/portal/family`
- `/portal/family/questions`

Typical workflow:
1. Open a consented patient from My Patients.
2. Review shared patient updates/documents.
3. Ask care-team questions.
4. Configure notification channels.
5. Upload supporting report if access level is not `VIEW_ONLY`.

What family member can do:
- View patient context only with active consent grant.
- Upload report only when access level allows (`VIEW_ONLY` is blocked).

## 8) Report Upload + OCR Flow

Applies to:
- Admin/Doctor/Specialist via care-team document endpoints
- Patient via patient portal upload
- Family via consent-scoped family upload endpoint

Flow:
1. File upload validates size/type policy.
2. File is stored via document storage driver.
3. Processing starts asynchronously.
4. Extraction path:
   - PDF -> text extraction
   - image -> OCR (`tesseract.js`)
   - text -> direct parse
5. Structured extraction derives:
   - report type
   - diagnoses
   - medications
   - vitals
   - lab-like key values
   - recommendations/follow-up
   - critical flags
6. Document metadata stores searchable fields for UI filtering and review.

## 9) Family Invitation + Consent Workflow

1. Admin/Doctor invites family member from patient context.
2. Patient sees pending invite and approves/rejects.
3. On approval, active grant is created/updated.
4. Audit trail records grant/revoke/view actions.
5. Family visibility is always constrained by active grant and expiry.

## 10) Operational Notes

1. If uploads fail, verify file type and size policy.
2. If OCR content is empty, check image quality or OCR config.
3. If patient not visible in specialist, confirm referral/order assignment or claim flow.
4. If family actions fail, verify access level and consent status.
