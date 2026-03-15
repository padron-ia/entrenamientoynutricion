-- TABLA DE LECTURAS PARA EL STAFF (Sincronización multidispositivo)
-- Guarda qué usuario del equipo ha leído qué anuncio.

create table if not exists public.staff_reads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  announcement_id uuid references public.announcements(id) on delete cascade not null,
  read_at timestamptz default now(),
  
  -- Evitar duplicados: Un usuario solo lee un anuncio una vez
  unique(user_id, announcement_id)
);

-- Permitir RLS (Seguridad)
alter table public.staff_reads enable row level security;

-- POLÍTICAS

-- 1. Un usuario puede ver sus propias lecturas
-- (El casting ::uuid asegura que coincida si auth.uid() devuelve algo ambiguo, aunque user_id ya es uuid)
create policy "Users can view their own reads" 
on public.staff_reads for select 
using (auth.uid() = user_id);

-- 2. Un usuario puede insertar sus propias lecturas
create policy "Users can mark as read" 
on public.staff_reads for insert 
with check (auth.uid() = user_id);

-- 3. (Opcional) Admin puede ver todo (para analíticas futuras)
-- SOLUCIÓN ERROR: Convertimos todo a text para comparar, evitando error uuid vs text
create policy "Admins can view all reads"
on public.staff_reads for select
using (
  auth.uid()::text in (
    select id::text from public.users where role = 'admin' or role = 'ADMIN'
  )
);
