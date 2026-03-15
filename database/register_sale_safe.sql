-- Function to register sales/renewals safely by looking up IDs if needed
CREATE OR REPLACE FUNCTION public.register_sale_safe(
    p_client_first_name TEXT,
    p_client_last_name TEXT,
    p_client_email TEXT,
    p_client_phone TEXT,
    p_client_dni TEXT,
    p_client_address TEXT,
    p_contract_duration INTEGER,
    p_hotmart_payment_link TEXT,
    p_payment_receipt_url TEXT,
    p_coach_id_or_name TEXT,
    p_closer_id_or_name TEXT,
    p_status TEXT,
    p_transaction_type TEXT,
    p_renewal_phase TEXT,
    p_sale_amount NUMERIC,
    p_net_amount NUMERIC,
    p_platform_fee_amount NUMERIC,
    p_commission_amount NUMERIC,
    p_sale_date TIMESTAMPTZ,
    p_coach_notes TEXT,
    p_payment_method TEXT
) RETURNS UUID AS $$
DECLARE
    v_actual_coach_id TEXT;
    v_actual_closer_id TEXT;
    v_sale_id UUID;
BEGIN
    -- Lookup Coach ID by name if it doesn't look like a UUID or if it's not found as ID
    -- Note: We check public.users(id) first
    SELECT id INTO v_actual_coach_id 
    FROM public.users 
    WHERE id = p_coach_id_or_name OR name = p_coach_id_or_name 
    LIMIT 1;

    -- Lookup Closer ID
    SELECT id INTO v_actual_closer_id 
    FROM public.users 
    WHERE id = p_closer_id_or_name OR name = p_closer_id_or_name 
    LIMIT 1;

    -- Fallback if not found: use a system admin or null if allowed
    -- But since assigned_coach_id is NOT NULL, we need SOMETHING.
    -- Better to fail with a clear message if no coach found, OR use the first admin.
    IF v_actual_coach_id IS NULL THEN
        SELECT id INTO v_actual_coach_id FROM public.users WHERE role = 'admin' LIMIT 1;
    END IF;
    
    IF v_actual_closer_id IS NULL THEN
        v_actual_closer_id := v_actual_coach_id;
    END IF;

    -- Insert into sales
    INSERT INTO public.sales (
        client_first_name,
        client_last_name,
        client_email,
        client_phone,
        client_dni,
        client_address,
        contract_duration,
        hotmart_payment_link,
        payment_receipt_url,
        assigned_coach_id,
        closer_id,
        status,
        transaction_type,
        renewal_phase,
        sale_amount,
        net_amount,
        platform_fee_amount,
        commission_amount,
        sale_date,
        coach_notes,
        payment_method
    ) VALUES (
        p_client_first_name,
        p_client_last_name,
        p_client_email,
        p_client_phone,
        p_client_dni,
        p_client_address,
        p_contract_duration,
        p_hotmart_payment_link,
        p_payment_receipt_url,
        v_actual_coach_id,
        v_actual_closer_id,
        p_status,
        p_transaction_type,
        p_renewal_phase,
        p_sale_amount,
        p_net_amount,
        p_platform_fee_amount,
        p_commission_amount,
        p_sale_date,
        p_coach_notes,
        p_payment_method
    ) RETURNING id INTO v_sale_id;

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
