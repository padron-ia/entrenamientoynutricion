-- PT Rebrand: project keys and main clients table

BEGIN;

-- 1) Rename legacy clients table to PT canonical name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clientes_ado_notion'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clientes_pt_notion'
  ) THEN
    EXECUTE 'ALTER TABLE public.clientes_ado_notion RENAME TO clientes_pt_notion';
  END IF;
END $$;

-- 2) Keep backwards compatibility for any legacy query still using clientes_ado_notion
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'clientes_pt_notion'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'clientes_ado_notion'
  ) THEN
    EXECUTE 'CREATE VIEW public.clientes_ado_notion AS SELECT * FROM public.clientes_pt_notion';
  END IF;
END $$;

-- 3) Migrate project values from ADO -> PT
UPDATE public.leads SET project = 'PT' WHERE project = 'ADO';
UPDATE public.sales SET project = 'PT' WHERE project = 'ADO';
UPDATE public.business_snapshots SET project = 'PT' WHERE project = 'ADO';

-- 4) Set defaults to PT in key tables if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'project'
  ) THEN
    EXECUTE 'ALTER TABLE public.leads ALTER COLUMN project SET DEFAULT ''PT''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'project'
  ) THEN
    EXECUTE 'ALTER TABLE public.sales ALTER COLUMN project SET DEFAULT ''PT''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_snapshots' AND column_name = 'project'
  ) THEN
    EXECUTE 'ALTER TABLE public.business_snapshots ALTER COLUMN project SET DEFAULT ''PT''';
  END IF;
END $$;

COMMIT;
