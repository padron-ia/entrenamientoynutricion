-- ============================================================================
-- Compatibilidad para tablas/vistas usadas por la app y no presentes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) Chat
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  is_direct BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT,
  message_type TEXT DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID,
  file_name TEXT,
  file_url TEXT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON public.chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_room_participants(user_id);

-- ---------------------------------------------------------------------------
-- 2) Alertas de riesgo
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  title TEXT,
  message TEXT,
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_risk_alert_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL,
  author_id TEXT,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_client ON public.client_risk_alerts(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_alert_comments_alert ON public.client_risk_alert_comments(alert_id, created_at);

-- ---------------------------------------------------------------------------
-- 3) Vistas de compatibilidad legacy
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.clients AS
SELECT
  c.id,
  c.user_id,
  c.property_nombre AS first_name,
  c.property_apellidos AS last_name,
  c.property_correo_electr_nico AS email,
  c.coach_id,
  c.property_coach,
  c.status,
  c.created_at,
  c.updated_at
FROM public.clientes_pt_notion c;

-- View util para panel de capacidad de coach
CREATE OR REPLACE VIEW public.coach_capacity_view AS
SELECT
  u.id AS coach_id,
  u.name AS coach_name,
  COUNT(c.id) FILTER (WHERE COALESCE(c.status, 'active') IN ('active', 'paused', 'pending'))::INTEGER AS assigned_clients,
  COUNT(c.id) FILTER (WHERE COALESCE(c.status, 'active') = 'active')::INTEGER AS active_clients
FROM public.users u
LEFT JOIN public.clientes_pt_notion c ON c.coach_id = u.id
WHERE COALESCE(u.role, 'coach') IN ('coach', 'head_coach', 'admin')
GROUP BY u.id, u.name;

GRANT SELECT ON public.clients TO anon, authenticated;
GRANT SELECT ON public.coach_capacity_view TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Baseline RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_risk_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_risk_alert_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_rooms' AND policyname='Chat rooms authenticated access'
  ) THEN
    CREATE POLICY "Chat rooms authenticated access" ON public.chat_rooms
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_room_participants' AND policyname='Chat participants authenticated access'
  ) THEN
    CREATE POLICY "Chat participants authenticated access" ON public.chat_room_participants
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_messages' AND policyname='Chat messages authenticated access'
  ) THEN
    CREATE POLICY "Chat messages authenticated access" ON public.chat_messages
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_attachments' AND policyname='Chat attachments authenticated access'
  ) THEN
    CREATE POLICY "Chat attachments authenticated access" ON public.chat_attachments
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_risk_alerts' AND policyname='Risk alerts authenticated access'
  ) THEN
    CREATE POLICY "Risk alerts authenticated access" ON public.client_risk_alerts
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='client_risk_alert_comments' AND policyname='Risk alert comments authenticated access'
  ) THEN
    CREATE POLICY "Risk alert comments authenticated access" ON public.client_risk_alert_comments
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END;
$$;
