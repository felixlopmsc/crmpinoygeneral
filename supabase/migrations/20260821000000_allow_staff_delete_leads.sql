-- Staff can delete leads.
--
-- public.leads had RLS enabled and no DELETE policy, so the Leads page's
-- delete button matched zero rows, returned no error, and the UI reported
-- success while the lead stayed put. That silent failure is the bug being
-- fixed; the UI now checks the affected row count either way.
--
-- Hard delete rather than a deleted_at flag, because nothing is destroyed with
-- the lead: the only inbound references are quote_requests.lead_id and
-- contact_submissions.lead_id, both ON DELETE SET NULL, so the quote request
-- or contact message survives and simply stops pointing at a lead that no
-- longer exists. Verified against production at time of writing: 1 quote
-- request and 0 contact submissions carry a lead_id.
--
-- Scoped to is_staff() (active Admin or Agent), matching every other
-- staff-guarded policy in this schema. Clients and policies are deliberately
-- NOT part of this change — deleting those cascades into commissions and
-- claims, which are financial records.

DROP POLICY IF EXISTS "Staff can delete leads" ON public.leads;
CREATE POLICY "Staff can delete leads" ON public.leads
  FOR DELETE TO authenticated
  USING (public.is_staff());
