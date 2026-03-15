-- Script to grant Direccion role permissions
-- Run this in Supabase SQL Editor
-- FIXED: Added ::text casting for auth.uid() to match id type

-- 1. Ensure users can read their own profile (basis for role checking)
-- This allows (SELECT role FROM users WHERE id = auth.uid()::text) to work
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile" 
ON public.users FOR SELECT 
TO authenticated 
USING ( id = auth.uid()::text );

-- 2. Grant Direccion view access to Users (Staff)
DROP POLICY IF EXISTS "Direccion view all users" ON public.users;
CREATE POLICY "Direccion view all users" 
ON public.users FOR SELECT 
TO authenticated 
USING ( (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'direccion' );

-- 3. Grant Direccion view access to Clients
DROP POLICY IF EXISTS "Direccion view all clients" ON public.clientes_pt_notion;
CREATE POLICY "Direccion view all clients" 
ON public.clientes_pt_notion FOR SELECT 
TO authenticated 
USING ( (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'direccion' );

-- 4. Grant Direccion view access to Sales
DROP POLICY IF EXISTS "Direccion view all sales" ON public.sales;
CREATE POLICY "Direccion view all sales" 
ON public.sales FOR SELECT 
TO authenticated 
USING ( (SELECT role FROM public.users WHERE id = auth.uid()::text) = 'direccion' );
