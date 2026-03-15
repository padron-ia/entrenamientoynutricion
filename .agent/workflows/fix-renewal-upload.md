---
description: Fix Renewal Receipt Upload Flow
---

This workflow resolves the error preventing clients from uploading renewal receipts and ensures coaches can verify them.

1. **Fix Table Name Mismatch**
   - Update `components/client-portal/ClientPortalDashboard.tsx` to use `clientes_pt_notion` instead of `clients` in the `handlePaymentUpload` function.
   - Improve error handling in the `try-catch` block to show detailed error messages if the update fails.

2. **Update Database Mappings**
   - Modify `services/mockSupabase.ts` to include renewal fields in `mapRowToClient` and `mapClientToRow`.
   - Fields: `renewal_payment_link`, `renewal_payment_status`, `renewal_receipt_url`, and `renewal_phase`.

3. **Verify UI Integration**
   - Ensure `RenewalsView.tsx` uses `renewal_receipt_url` from the client object.
   - Ensure `ClientDetail.tsx` displays the uploaded receipt link to the coach and allows "Auto-activation" of the next phase.
   - Ensure `AccountingDashboard.tsx` passes `paymentLinks` and `sales` to `RenewalsView` for correct amount calculation.

4. **Database Verification (Optional)**
   - Run `database/add_renewal_payment_fields.sql` if the columns are missing in a real environment.
