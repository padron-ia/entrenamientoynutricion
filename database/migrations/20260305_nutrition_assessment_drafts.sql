-- Migration: nutrition_assessment_drafts
-- Description: Table to persist drafts of nutrition assessment forms for global availability.

CREATE TABLE IF NOT EXISTS public.nutrition_assessment_drafts (
    client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
    form_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_assessment_drafts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Clients can manage their own assessment drafts"
    ON public.nutrition_assessment_drafts
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.clients WHERE id = client_id))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.clients WHERE id = client_id));

-- Trigger for updated_at
CREATE TRIGGER update_nutrition_assessment_drafts_updated_at
    BEFORE UPDATE ON public.nutrition_assessment_drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
