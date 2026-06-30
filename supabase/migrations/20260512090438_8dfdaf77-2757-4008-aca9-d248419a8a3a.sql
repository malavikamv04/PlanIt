-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;

create policy "view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins view all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "view own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- New user trigger: profile + default role + admin promotion
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  if lower(new.email) = 'malalavikamv04@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text not null,
  event_date date not null,
  event_time text not null,
  location text not null,
  city text not null,
  price text not null default 'Free',
  spots integer not null default 0,
  image_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "anyone view events" on public.events for select using (true);
create policy "admins insert events" on public.events for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admins update events" on public.events for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins delete events" on public.events for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "hosts insert their events" on public.events for insert to authenticated with check (auth.uid() = created_by);
create policy "hosts update their events" on public.events for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();

-- RSVPs
create type public.rsvp_status as enum ('upcoming','past','cancelled');
create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete cascade not null,
  qty integer not null default 1 check (qty > 0),
  status public.rsvp_status not null default 'upcoming',
  attendee_name text,
  attendee_email text,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);
alter table public.rsvps enable row level security;
create policy "view own rsvps" on public.rsvps for select to authenticated using (auth.uid() = user_id);
create policy "create own rsvps" on public.rsvps for insert to authenticated with check (auth.uid() = user_id);
create policy "update own rsvps" on public.rsvps for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own rsvps" on public.rsvps for delete to authenticated using (auth.uid() = user_id);
create policy "admins view all rsvps" on public.rsvps for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- Seed events
insert into public.events (title, category, description, event_date, event_time, location, city, price, spots) values
('Midnight Jazz Sessions', 'Music', 'An intimate evening of contemporary jazz featuring three rising ensembles under candlelight.', '2026-06-14', '9:00 PM', 'Blue Note Cellar', 'Brooklyn, NY', '$45', 24),
('Future of Design Summit', 'Conference', 'A full day of talks and workshops with the designers shaping tomorrow''s interfaces and products.', '2026-07-02', '10:00 AM', 'The Foundry', 'San Francisco, CA', '$180', 142),
('Sunrise Trail Run', 'Wellness', 'Greet the longest day of the year with a guided 8K through alpine trails. Coffee and pastries to follow.', '2026-06-21', '5:30 AM', 'Eagle Ridge Park', 'Boulder, CO', 'Free', 60),
('Natural Wine Tasting', 'Food & Drink', 'Eight pours from small European producers, paired with seasonal small plates from Chef Mara Lin.', '2026-06-28', '7:00 PM', 'Cellar 47', 'Austin, TX', '$65', 32),
('Indie Film Premiere', 'Film', 'First public screening of ''Quiet Light'', followed by a Q&A with director Asha Okafor.', '2026-07-11', '8:00 PM', 'Lumière Theater', 'Portland, OR', '$22', 80),
('Ceramics Workshop', 'Workshop', 'Hand-build your own stoneware vessel in a small group session. All materials and firing included.', '2026-07-19', '1:00 PM', 'Kiln Studio', 'Brooklyn, NY', '$95', 12);
