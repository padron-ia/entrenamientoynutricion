-- Asignar rol de dirección al Dr. Víctor Bravo
UPDATE public.users 
SET role = 'direccion' 
WHERE email = 'doctorvictorbravo@gmail.com';

-- Verificar el cambio
SELECT email, role FROM public.users WHERE email = 'doctorvictorbravo@gmail.com';
