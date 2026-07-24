-- Remove the redundant AFTER-INSERT quote->lead path so there is a single,
-- clearly-owned trigger that can ever create a lead from a quote request.
--
-- Context (verified against the live function bodies before writing this):
--   * public.quote_requests had TWO lead-creating triggers on INSERT:
--       - trg_create_lead_from_quote_request  BEFORE INSERT
--           -> create_lead_from_quote_request()   [KEEP: the good one]
--         Guards on NEW.lead_id IS NULL, sets NEW.lead_id inline (atomic),
--         emits status='new' / priority='hot', writes a rich notes field.
--       - on_quote_request_insert_create_lead  AFTER INSERT
--           -> sync_quote_request_to_lead()       [DROP: redundant duplicate]
--         Guards on NEW.lead_id IS NULL, emits priority='normal', no notes,
--         and does a separate UPDATE to set lead_id.
--   * The AFTER function writes no column the BEFORE function does not (it is
--     a strict subset, with weaker/equal values), so it is safe to remove.
--     It only no-ops today because the BEFORE trigger has already populated
--     NEW.lead_id by the time it runs; that latent duplication risk is what
--     this migration eliminates.
--
-- This does NOT modify the surviving BEFORE trigger or its function.
-- Idempotent: safe to re-run.

DROP TRIGGER IF EXISTS on_quote_request_insert_create_lead ON public.quote_requests;
DROP FUNCTION IF EXISTS public.sync_quote_request_to_lead();
