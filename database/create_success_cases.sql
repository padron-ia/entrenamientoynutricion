
-- Create Success Cases Table
create table if not exists public.success_cases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clientes_pt_notion(id) on delete set null,
  patient_name text not null,
  initial_fear text,
  life_achievement text,
  status text default 'draft', -- 'draft', 'ready'
  assets jsonb default '[]'::jsonb, -- Array of assets {id, url, type...}
  ai_output jsonb, -- The result from Gemini
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) default auth.uid()
);

-- Enable RLS
alter table public.success_cases enable row level security;

-- Policies
create policy "Enable read for authenticated users" on public.success_cases
  for select using (auth.role() = 'authenticated');

create policy "Enable insert for authenticated users" on public.success_cases
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.success_cases
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for users" on public.success_cases
  for delete using (auth.role() = 'authenticated');
