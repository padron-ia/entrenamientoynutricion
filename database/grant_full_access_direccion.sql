-- Grant Full SELECT Access to 'direccion' role for analysis tables

-- Users table
DROP POLICY IF EXISTS "Direccion view all users" ON public.users;
CREATE POLICY "Direccion view all users"
ON public.users FOR SELECT
TO authenticated
USING ( (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'direccion' );

-- Clients table (PT)
DROP POLICY IF EXISTS "Direccion view all clients" ON public.clientes_pt_notion;
CREATE POLICY "Direccion view all clients"
ON public.clientes_pt_notion FOR SELECT
TO authenticated
USING ( (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'direccion' );

-- Sales table
DROP POLICY IF EXISTS "Direccion view all sales" ON public.sales;
CREATE POLICY "Direccion view all sales"
ON public.sales FOR SELECT
TO authenticated
USING ( (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'direccion' );

-- Leads table
DROP POLICY IF EXISTS "Direccion view all leads" ON public.leads;
CREATE POLICY "Direccion view all leads"
ON public.leads FOR SELECT
TO authenticated
USING ( (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'direccion' );

-- Checkins table
DROP POLICY IF EXISTS "Direccion view all checkins" ON public.checkins;
CREATE POLICY "Direccion view all checkins"
ON public.checkins FOR SELECT
TO authenticated
USING ( (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'direccion' );

-- Medical Reviews table
DROP POLICY IF EXISTS "Direccion view all medical reviews" ON public.medical_reviews;
CREATE POLICY "Direccion view all medical reviews"
ON public.medical_reviews FOR SELECT
TO authenticated
USING ( (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'direccion' );

-- Testimonials table
DROP POLICY IF EXISTS "Direccion view all testimonials" ON public.testimonials;
CREATE POLICY "Direccion view all testimonials"
ON public.testimonials FOR SELECT
TO authenticated
USING ( (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'direccion' );

-- Roles and Permissions table (if exists)
-- This is a generic grant for the Dirección role to see almost everything for reporting purposes.
