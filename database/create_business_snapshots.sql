-- Centralized table for Global Business KPIs (Snapshots)
CREATE TABLE IF NOT EXISTS business_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
    
    -- 1. RRSS & Audience Growth
    ig_followers INTEGER DEFAULT 0,
    yt_subs INTEGER DEFAULT 0,
    email_subs INTEGER DEFAULT 0,
    
    -- 2. Marketing & Leads
    ad_investment DECIMAL(12, 2) DEFAULT 0,
    leads_count INTEGER DEFAULT 0,
    -- cpl will be calculated in UI or via view
    
    -- 3. Sales Funnel
    outbound_conv INTEGER DEFAULT 0,
    inbound_conv INTEGER DEFAULT 0,
    forms_submitted INTEGER DEFAULT 0,
    calls_scheduled INTEGER DEFAULT 0,
    calls_presented INTEGER DEFAULT 0,
    closed_sales INTEGER DEFAULT 0,
    reservations INTEGER DEFAULT 0,
    
    -- 4. Financials
    billing_total DECIMAL(12, 2) DEFAULT 0,
    cash_collected DECIMAL(12, 2) DEFAULT 0,
    expenses DECIMAL(12, 2) DEFAULT 0,
    taxes DECIMAL(12, 2) DEFAULT 0,
    -- ebitda, margin, ltv, cac will be calculated in UI or via view
    
    -- 5. Automated/Calculated Snapshot Fields (Handled by sync functions)
    active_clients INTEGER DEFAULT 0,
    churn_rate DECIMAL(5, 2) DEFAULT 0,
    renewals_pct DECIMAL(5, 2) DEFAULT 0,
    success_cases_pct DECIMAL(5, 2) DEFAULT 0,
    referrals_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE business_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access" ON business_snapshots
    FOR ALL USING (true) WITH CHECK (true);

-- RRSS role can only view the growth/marketing metrics (restricted view)
CREATE POLICY "RRSS view access" ON business_snapshots
    FOR SELECT USING (true);

-- ==========================================
-- Webinar Specific Metrics
-- ==========================================
CREATE TABLE IF NOT EXISTS webinar_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g. "Webinar Diabetes Enero 2026"
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- 1. Marketing & Lead Gen
    ad_investment DECIMAL(12, 2) DEFAULT 0,
    leads_total INTEGER DEFAULT 0,
    leads_whatsapp INTEGER DEFAULT 0,
    conversations INTEGER DEFAULT 0,
    
    -- 2. Attendance & Engagement
    live_leads_start INTEGER DEFAULT 0, -- Leads in live at start
    live_leads_end INTEGER DEFAULT 0,   -- Leads in live at end
    views_total INTEGER DEFAULT 0,
    attendance_pct DECIMAL(5, 2) DEFAULT 0,
    
    -- 3. Funnel & Sales
    forms_submitted INTEGER DEFAULT 0,
    contacted_count INTEGER DEFAULT 0,
    calls_scheduled INTEGER DEFAULT 0,
    calls_presented_pct DECIMAL(5, 2) DEFAULT 0,
    closing_pct DECIMAL(5, 2) DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    
    -- 4. Financials
    contracted_money DECIMAL(12, 2) DEFAULT 0,
    cash_collected DECIMAL(12, 2) DEFAULT 0,
    roas DECIMAL(10, 2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for Webinars
ALTER TABLE webinar_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on webinars" ON webinar_metrics
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "RRSS view access on webinars" ON webinar_metrics
    FOR SELECT USING (true);
