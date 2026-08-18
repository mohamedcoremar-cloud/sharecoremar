# Diagnosis — Suppliers "is_active" error (no changes made)

## 1. What column represents active/inactive on suppliers?
There is **no boolean active column**. Verified live columns on `public.suppliers`: id, user_id, company_name, brand_name, owner_name, business_type, tax_number, commercial_registration, vat_number, description, address, governorate, city, phone, whatsapp, email, logo_url, cover_url, **status**, is_featured, rating, created_at, updated_at.

`status` is an enum (`verification_status`): pending / approved / rejected / suspended. That is the real state field — approved = live, suspended/rejected = not live.

## 2. Is the admin screen writing to `is_active`? Is that the error source?
Yes — and that is exactly the error source. `src/routes/admin/suppliers.tsx` renders the shared `CrudPage` without passing `hasActive`/`activeKey`, and `CrudPage` defaults to `activeKey = "is_active"` and `hasActive = true`. So:
- The Active/Inactive filter chips read `row.is_active` (always undefined → the "Active" filter shows nothing).
- Bulk enable/disable runs `update({ is_active: ... })` on `suppliers`, producing "Could not find the 'is_active' column of 'suppliers' in the schema cache".

The column genuinely does not exist in the live schema.

## 3. Is there an existing working pattern to reuse?
Yes. `CrudPage` already supports a configurable state column, used by:
- Products / Categories / Brands / Banners: real `is_active` boolean (default).
- Pages: `activeKey="is_published"`.
- Payment methods: `activeKey="is_enabled"`.

So the established pattern is "tell CrudPage which column holds the state", not "add a new column".

## 4. Does supplier_users have its own is_active? Was the logic mis-pointed?
Confirmed: `public.supplier_users` has its own `is_active` boolean (columns: id, user_id, supplier_id, **is_active**, created_at, updated_at, created_by, updated_by, deleted_at). It is a separate link table (which user account operates which supplier) and is unrelated to supplier approval state. The Suppliers screen inherited `is_active` purely from the CrudPage default — it is a naming mismatch of the same kind, and it should target `suppliers.status` instead.

## Recommended minimal fix (not applied)
Do **not** add an `is_active` column to `suppliers` — it would duplicate and contradict `status`.

Correct the screen only, in `src/routes/admin/suppliers.tsx`:
- Pass `hasActive={false}` so the boolean filter chips and bulk enable/disable (the code that writes `is_active`) are not rendered for suppliers.
- Keep the existing `status` select field in the edit form as the way an admin approves/suspends a supplier (already present and already enforced admin-only by the `protect_supplier_verification_fields` trigger).

Optional, if you want one-click approve/suspend from the list instead of opening the dialog: a small suppliers-specific status action that updates `suppliers.status` to `approved` / `suspended`. That is a second, larger step — say the word and I'll include it.

## Scope guarantee
The fix touches only `src/routes/admin/suppliers.tsx` (frontend). It will **not** touch `supplier_users`, the Supplier Portal (`/supplier`), orders, order history, RLS policies, triggers, or any database schema/data.
