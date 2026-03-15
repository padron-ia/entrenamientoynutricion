# Procedimiento Interno: Onboarding Cliente Gestionado

**DOCUMENTO INTERNO - NO COMPARTIR CON CLIENTES**

Este documento describe el proceso paso a paso para configurar un nuevo cliente del plan gestionado.

---

## Informacion del Cliente

Completar antes de empezar:

```
Fecha de alta: ____/____/________
Nombre del negocio: _________________________________
Contacto principal: _________________________________
Email: _____________________________________________
Telefono: __________________________________________
Dominio deseado: ___________________________________
```

---

## FASE 1: Recepcion del Pedido (Dia 0)

### 1.1 Verificar pago
```
[ ] Pago de setup (197€) recibido
[ ] Metodo de pago mensual configurado (tarjeta/domiciliacion)
[ ] Factura de setup enviada
```

### 1.2 Recopilar informacion del cliente
Enviar formulario de onboarding con:
```
[ ] Nombre comercial
[ ] Razon social y CIF
[ ] Direccion fiscal
[ ] IBAN para mostrar a sus clientes
[ ] Email de contacto publico
[ ] Telefono publico
[ ] Logo (PNG, min 200x50px)
[ ] Colores de marca (hex primario y secundario)
[ ] Dominio deseado (o subdominio nuestro)
```

### 1.3 Crear carpeta del cliente
```
[ ] Crear carpeta en Drive: /Clientes Gestionados/{NombreNegocio}/
[ ] Subir documentos recibidos
[ ] Crear hoja de seguimiento
```

---

## FASE 2: Infraestructura (Dia 1)

### 2.1 Crear proyecto en Supabase
```
[ ] Login en cuenta maestra de Supabase
[ ] Crear nuevo proyecto: crm-{nombre-cliente}
[ ] Region: EU West (o la que pida el cliente)
[ ] Anotar credenciales en hoja del cliente:
    - Project URL: _______________________________
    - Anon Key: __________________________________
    - Service Role Key: __________________________
```

### 2.2 Ejecutar script de instalacion
```
[ ] Abrir SQL Editor en Supabase
[ ] Ejecutar SETUP_COMPLETO.sql
[ ] Verificar que no hay errores
[ ] Crear buckets de storage manualmente si fallo:
    [ ] documents
    [ ] receipts
    [ ] contracts
    [ ] invoices
    [ ] avatars (publico)
```

### 2.3 Configurar datos del negocio
```sql
-- Ejecutar en SQL Editor con datos del cliente:
UPDATE app_settings SET value = 'NOMBRE_NEGOCIO' WHERE key = 'business_name';
UPDATE app_settings SET value = 'RAZON_SOCIAL' WHERE key = 'business_legal_name';
UPDATE app_settings SET value = 'CIF' WHERE key = 'business_cif';
UPDATE app_settings SET value = 'EMAIL' WHERE key = 'business_email';
UPDATE app_settings SET value = 'TELEFONO' WHERE key = 'business_phone';
UPDATE app_settings SET value = 'DIRECCION' WHERE key = 'business_address';
UPDATE app_settings SET value = 'IBAN' WHERE key = 'business_iban';
```

---

## FASE 3: Frontend (Dia 1)

### 3.1 Clonar repositorio
```bash
# En servidor de despliegue o Vercel
git clone [repo-privado] crm-{nombre-cliente}
cd crm-{nombre-cliente}
```

### 3.2 Personalizar branding
```
[ ] Reemplazar public/logo.png con logo del cliente
[ ] Reemplazar public/favicon.ico
[ ] Editar tailwind.config.js con colores del cliente
[ ] Editar index.html:
    - <title>
    - meta description
    - og:image (si tienen)
```

### 3.3 Configurar variables de entorno
```
[ ] Crear .env.local con credenciales de Supabase
[ ] Verificar build local: npm run build
```

### 3.4 Desplegar
```
[ ] Conectar repo a Vercel (proyecto: crm-{nombre-cliente})
[ ] Configurar variables de entorno en Vercel
[ ] Verificar despliegue exitoso
[ ] Anotar URL temporal: ____________________________
```

---

## FASE 4: Dominio (Dia 1-2)

### Opcion A: Subdominio nuestro
```
[ ] Crear subdominio: {cliente}.nuestro-dominio.com
[ ] Configurar en Vercel
[ ] Verificar SSL activo
```

### Opcion B: Dominio del cliente
```
[ ] Solicitar acceso DNS al cliente
    O
[ ] Enviar instrucciones de configuracion CNAME
[ ] Esperar propagacion (hasta 48h)
[ ] Configurar dominio en Vercel
[ ] Verificar SSL activo
```

---

## FASE 5: Usuarios (Dia 2)

### 5.1 Crear usuario Admin del cliente
```
[ ] En Supabase > Authentication > Users > Add User
    Email: [email del cliente]
    Password: [generar password seguro]
[ ] Actualizar rol a admin:
    UPDATE users SET role = 'admin' WHERE email = '[email]';
[ ] Anotar credenciales para enviar al cliente
```

### 5.2 Crear usuarios adicionales (si los pidio)
```
[ ] Coach 1: __________________ rol: coach
[ ] Coach 2: __________________ rol: coach
[ ] Closer 1: _________________ rol: closer
[ ] Contabilidad: _____________ rol: contabilidad
```

---

## FASE 6: Verificacion (Dia 2)

### Test funcional completo
```
[ ] Login como admin funciona
[ ] Dashboard se ve correctamente
[ ] Logo y colores correctos
[ ] Crear venta de prueba
[ ] Generar enlace de onboarding
[ ] Completar onboarding de prueba
[ ] Verificar cliente aparece en dashboard
[ ] Subir archivo de prueba (comprobante)
[ ] Eliminar datos de prueba
```

### Verificar seguridad
```
[ ] RLS activo en todas las tablas
[ ] Usuarios de demo eliminados
[ ] No hay datos de prueba
```

---

## FASE 7: Entrega (Dia 2)

### 7.1 Preparar email de entrega
```
Incluir:
[ ] URL de acceso: https://...
[ ] Credenciales de admin
[ ] Link a documentacion
[ ] Link para agendar sesion de formacion
```

### 7.2 Sesion de formacion (agendar)
```
[ ] Enviar link de Calendly
[ ] Preparar demo personalizada
[ ] Duracion: 1 hora
[ ] Temas a cubrir:
    - Tour general del CRM
    - Como crear ventas
    - Como gestionar clientes
    - Renovaciones
    - Dudas del cliente
```

### 7.3 Activar facturacion recurrente
```
[ ] Configurar cobro mensual (47€)
[ ] Fecha primer cobro: ____/____/________
[ ] Metodo: [ ] Stripe [ ] Domiciliacion [ ] Otro
```

---

## FASE 8: Post-Entrega

### Seguimiento a los 7 dias
```
[ ] Email de seguimiento enviado
[ ] Verificar que estan usando el CRM
[ ] Resolver dudas pendientes
```

### Seguimiento al mes
```
[ ] Verificar satisfaccion
[ ] Ofrecer formacion adicional si necesitan
[ ] Revisar metricas de uso
```

---

## Notas del Setup

```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## Responsable del Onboarding

```
Realizado por: _________________________________
Fecha completado: ____/____/________
Firma: _________________________________________
```

---

*Documento interno v1.0 - Enero 2026*
