-- Enable Realtime for sales table
ALTER publication supabase_realtime ADD TABLE sales;

-- Also for clientes_pt_notion just in case
ALTER publication supabase_realtime ADD TABLE clientes_pt_notion;

-- Ensure RLS is disabled for these tables to allow the coach to see data without complex policies for now
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_pt_notion DISABLE ROW LEVEL SECURITY;
