-- AFFECTS BOTH APPS: shared Supabase project fetiakfllzxwibqzfedh. The client
-- portal (pinoy-insurance-portal) reads client_profiles.client_id to find a
-- client's policies; this migration changes who may write that column and adds
-- the two ways it now gets set. Portal changes ship alongside.
--
-- Spec: docs/invite-claim-flow.md
--
-- Additive: two tables, three functions, one trigger, one grant change.
-- Nothing is dropped or rewritten.
--
-- ROLLBACK:
--   drop trigger if exists trg_file_profile_link_request on public.client_profiles;
--   drop function if exists public.file_profile_link_request();
--   drop function if exists public.link_client_profile(uuid, uuid);
--   drop function if exists public.redeem_client_invite(text);
--   drop function if exists public.create_client_invite(uuid, text, integer);
--   drop table if exists public.profile_link_requests;
--   drop table if exists public.client_invites;
--   grant update on public.client_profiles to authenticated;  -- restores table-level UPDATE

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. client_id stops being client-writable
--
-- client_profiles_update_own is WITH CHECK (auth.uid() = id): it constrains
-- which ROW you may update, not which COLUMNS, and authenticated holds
-- table-level UPDATE. Three policies resolve access through this column
-- (portal_clients_select_own_policies / _documents / _client), so a client
-- could point client_id at any clients.id and read that client's book.
--
-- Column privileges rather than a trigger: declarative, and it cannot be
-- bypassed by a later policy edit. id, created_at and client_id become
-- unwritable through PostgREST; the SECURITY DEFINER functions below are the
-- only paths that set client_id, and each decides the value itself.
-- ─────────────────────────────────────────────────────────────────────────────

revoke update on public.client_profiles from authenticated;
grant  update (email, first_name, last_name, phone, referral_code, updated_at)
       on public.client_profiles to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. invites
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.client_invites (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  token_hash  text not null unique,
  email       text not null,
  created_by  uuid references public.users(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id)
);

comment on table public.client_invites is
  'Single-use, expiring invites binding a signup to one clients.id. token_hash is sha256 of the token; the raw token is never stored, so a database read cannot recover a live invite.';

create index if not exists client_invites_client_id_idx on public.client_invites (client_id);
create index if not exists client_invites_open_idx      on public.client_invites (expires_at) where redeemed_at is null;

alter table public.client_invites enable row level security;

-- Staff only. Deliberately NO own-rows policy for clients: a client has no
-- legitimate read here, and one would make this an enumeration surface.
-- Redemption goes through a SECURITY DEFINER function, which does not need
-- the caller to hold SELECT.
drop policy if exists client_invites_staff_all on public.client_invites;
create policy client_invites_staff_all on public.client_invites
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. the staff queue for signups that arrive without an invite
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profile_link_requests (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null unique references public.client_profiles(id) on delete cascade,
  email            text not null,
  first_name       text,
  last_name        text,
  phone            text,
  status           text not null default 'pending',
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  resolved_by      uuid references public.users(id),
  linked_client_id uuid references public.clients(id),
  constraint profile_link_requests_status_check
    check (status in ('pending','linked','dismissed'))
);

comment on table public.profile_link_requests is
  'Signups with no invite. Staff match these to a client by hand. A signup without an invite is not an error and must never be a silent empty dashboard.';

create index if not exists profile_link_requests_pending_idx
  on public.profile_link_requests (created_at desc) where status = 'pending';

alter table public.profile_link_requests enable row level security;

-- Both existing patterns: is_staff() for staff, own-rows for the client.
drop policy if exists profile_link_requests_staff_all on public.profile_link_requests;
create policy profile_link_requests_staff_all on public.profile_link_requests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists profile_link_requests_select_own on public.profile_link_requests;
create policy profile_link_requests_select_own on public.profile_link_requests
  for select to authenticated using (profile_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. staff mints an invite; the raw token is returned exactly once
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.create_client_invite(
  p_client_id uuid,
  p_email     text,
  p_days      integer default 14
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
  v_id    uuid;
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;
  if p_client_id is null or p_email is null or btrim(p_email) = '' then
    raise exception 'client and email are required';
  end if;

  -- 32 random bytes, url-safe. Long enough that guessing is not a strategy.
  v_token := replace(replace(encode(extensions.gen_random_bytes(32), 'base64'), '+', '-'), '/', '_');
  v_token := replace(v_token, '=', '');

  insert into public.client_invites (client_id, token_hash, email, created_by, expires_at)
  values (
    p_client_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    btrim(p_email),
    auth.uid(),
    now() + make_interval(days => greatest(p_days, 1))
  )
  returning id into v_id;

  -- The only time the raw token exists outside the recipient's email.
  return jsonb_build_object('invite_id', v_id, 'token', v_token,
                            'expires_at', now() + make_interval(days => greatest(p_days, 1)));
end;
$$;

revoke all on function public.create_client_invite(uuid, text, integer) from public, anon;
grant execute on function public.create_client_invite(uuid, text, integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. the bind
--
-- Takes ONLY the token. client_id comes off the invite row and is never
-- accepted from the caller. Every failure returns the same generic reason so
-- the function cannot be used to probe which tokens exist.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.redeem_client_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid    uuid := auth.uid();
  v_invite public.client_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if p_token is null or btrim(p_token) = '' then
    return jsonb_build_object('linked', false, 'reason', 'invalid_or_expired');
  end if;

  select * into v_invite
    from public.client_invites
   where token_hash = encode(extensions.digest(btrim(p_token), 'sha256'), 'hex')
     and redeemed_at is null
     and expires_at > now()
   for update;

  if not found then
    return jsonb_build_object('linked', false, 'reason', 'invalid_or_expired');
  end if;

  update public.client_profiles
     set client_id = v_invite.client_id,
         updated_at = now()
   where id = v_uid;

  if not found then
    return jsonb_build_object('linked', false, 'reason', 'no_profile');
  end if;

  update public.client_invites
     set redeemed_at = now(), redeemed_by = v_uid
   where id = v_invite.id;

  update public.profile_link_requests
     set status = 'linked', resolved_at = now(), linked_client_id = v_invite.client_id
   where profile_id = v_uid and status = 'pending';

  return jsonb_build_object('linked', true, 'client_id', v_invite.client_id);
end;
$$;

revoke all on function public.redeem_client_invite(text) from public, anon;
grant execute on function public.redeem_client_invite(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. staff resolving the queue by hand -- now the only way staff can write
--    client_id, since the column grant was revoked above
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.link_client_profile(p_profile_id uuid, p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;
  if p_profile_id is null or p_client_id is null then
    raise exception 'profile and client are required';
  end if;

  update public.client_profiles
     set client_id = p_client_id, updated_at = now()
   where id = p_profile_id;

  if not found then
    raise exception 'profile not found';
  end if;

  update public.profile_link_requests
     set status = 'linked', resolved_at = now(),
         resolved_by = auth.uid(), linked_client_id = p_client_id
   where profile_id = p_profile_id;

  return jsonb_build_object('linked', true);
end;
$$;

revoke all on function public.link_client_profile(uuid, uuid) from public, anon;
grant execute on function public.link_client_profile(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. a signup with no invite files itself into the queue
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.file_profile_link_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.client_id is null then
    insert into public.profile_link_requests (profile_id, email, first_name, last_name, phone)
    values (new.id, new.email, new.first_name, new.last_name, new.phone)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_file_profile_link_request on public.client_profiles;
create trigger trg_file_profile_link_request
  after insert on public.client_profiles
  for each row execute function public.file_profile_link_request();
