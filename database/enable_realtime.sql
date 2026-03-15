-- 🔔 ACTIVAR REALTIME PARA TABLAS CLAVE
-- Este script asegura que las tablas de anuncios y ventas notifiquen cambios en tiempo real.

-- 1. Asegurar que la publicación 'supabase_realtime' existe
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- 2. Añadir tablas a la publicación (con control de errores por si ya existen)
-- Nota: En Postgres 15+ se puede usar 'alter publication ... add table IF NOT EXISTS', 
-- pero para mayor compatibilidad usamos este bloque:
do $$
begin
  -- Tabla Announcements
  begin
    alter publication supabase_realtime add table public.announcements;
  exception when others then 
    raise notice 'La tabla announcements ya estaba en la publicación o no existe.';
  end;

  -- Tabla Sales (para notificaciones de asignación a coaches)
  begin
    alter publication supabase_realtime add table public.sales;
  exception when others then 
    raise notice 'La tabla sales ya estaba en la publicación o no existe.';
  end;
end $$;

-- 3. Configurar Identidad de Réplica (Full para asegurar que lleguen todos los datos en updates)
alter table public.announcements replica identity full;
alter table public.sales replica identity full;

-- Verificación final
select * from pg_publication_tables where pubname = 'supabase_realtime';
