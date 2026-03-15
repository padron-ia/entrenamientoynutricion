-- Create table to store metrics from Notion 'Leads' database
CREATE TABLE IF NOT EXISTS public.notion_leads_metrics (
    notion_id text PRIMARY KEY,
    nombre_lead text,
    setter text,
    closer text,
    procedencia text,
    inb_out text,
    dia_agenda timestamp with time zone,
    dia_llamada timestamp with time zone,
    estado_lead text,
    presentado boolean DEFAULT false,
    cierre boolean DEFAULT false,
    pago text,
    telefono text,
    perfil_ig text,
    last_updated_at timestamp with time zone DEFAULT now()
);

-- DISABLE RLS for this internal metrics table to allow easy syncing via scripts
ALTER TABLE public.notion_leads_metrics DISABLE ROW LEVEL SECURITY;

-- Indexes for performance on analytics
CREATE INDEX IF NOT EXISTS idx_leads_setter ON public.notion_leads_metrics(setter);
CREATE INDEX IF NOT EXISTS idx_leads_closer ON public.notion_leads_metrics(closer);
CREATE INDEX IF NOT EXISTS idx_leads_dia_agenda ON public.notion_leads_metrics(dia_agenda);
CREATE INDEX IF NOT EXISTS idx_leads_estado ON public.notion_leads_metrics(estado_lead);
