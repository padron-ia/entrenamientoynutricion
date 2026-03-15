# 🏢 Configuración del Negocio - Personalización Completa

**Versión:** 1.0 (Enero 2026)
**Prerequisito:** Haber completado `0_GUIA_INSTALACION_PRODUCTO.md`
**Objetivo:** Adaptar el CRM genérico a la identidad y operativa de tu negocio específico.

---

## 📝 1. Datos Legales y Fiscales

### 1.1. Información de la Empresa

Estos datos aparecerán en contratos, facturas y comunicaciones oficiales.

```sql
-- Ejecutar en Supabase SQL Editor
INSERT INTO app_settings (key, value, description) VALUES
  -- Identidad
  ('business_name', 'TU NOMBRE COMERCIAL', 'Nombre comercial del negocio'),
  ('business_legal_name', 'TU RAZÓN SOCIAL SL', 'Razón social completa'),
  ('business_cif', 'B12345678', 'CIF/NIF de la empresa'),

  -- Contacto
  ('business_email', 'contacto@tunegocio.com', 'Email principal'),
  ('business_phone', '+34 600 000 000', 'Teléfono de contacto'),
  ('business_address', 'Calle Principal 123, 28001 Madrid', 'Dirección fiscal'),

  -- Bancarios
  ('business_iban', 'ES00 0000 0000 0000 0000 0000', 'IBAN para transferencias'),
  ('business_bank_name', 'Banco Ejemplo', 'Nombre del banco'),
  ('business_swift', 'EXAMPLEXXX', 'Código SWIFT/BIC'),

  -- Web
  ('business_website', 'https://www.tunegocio.com', 'Web principal'),
  ('business_app_url', 'https://app.tunegocio.com', 'URL de la aplicación')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### 1.2. Datos para Contratos (RGPD)

```sql
INSERT INTO app_settings (key, value, description) VALUES
  -- Responsable del tratamiento
  ('gdpr_controller_name', 'TU NOMBRE O EMPRESA', 'Responsable tratamiento datos'),
  ('gdpr_controller_email', 'privacidad@tunegocio.com', 'Email DPO/Privacidad'),

  -- Textos legales
  ('legal_disclaimer', 'Este servicio es de acompañamiento educativo y NO sustituye consejo médico profesional.', 'Aviso legal en contratos'),

  -- Política de cancelación
  ('cancellation_policy', 'El cliente puede cancelar con 15 días de antelación...', 'Política de bajas')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

---

## 💳 2. Configuración de Pagos

### 2.1. Links de Pago (Hotmart, Stripe, etc.)

```sql
-- Limpiar links de ejemplo y añadir los tuyos
DELETE FROM payment_links WHERE is_active = false;

INSERT INTO payment_links (name, url, duration_months, amount, is_active) VALUES
  -- Packs estándar
  ('Pack Trimestral', 'https://pay.hotmart.com/TU_LINK_3M', 3, 297, true),
  ('Pack Semestral', 'https://pay.hotmart.com/TU_LINK_6M', 6, 497, true),
  ('Pack Anual', 'https://pay.hotmart.com/TU_LINK_12M', 12, 797, true),

  -- Métodos manuales
  ('Transferencia Bancaria', 'MANUAL_TRANSFER', NULL, NULL, true),
  ('Pago en Efectivo', 'MANUAL_CASH', NULL, NULL, true),
  ('Financiación Externa', 'MANUAL_FINANCED', NULL, NULL, true)
ON CONFLICT DO NOTHING;
```

### 2.2. Configuración de Comisiones

```sql
-- Porcentajes de comisión por rol
INSERT INTO app_settings (key, value, description) VALUES
  ('commission_closer_percentage', '10', 'Comisión para Closers (%)'),
  ('commission_setter_percentage', '5', 'Comisión para Setters (%)'),
  ('commission_coach_percentage', '15', 'Comisión para Coaches (%)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

---

## 👥 3. Configuración de Roles

### 3.1. Roles Disponibles en el Sistema

| Rol | Código | Permisos Principales |
|-----|--------|---------------------|
| **Administrador** | `admin` | Acceso total, gestión de staff |
| **Head Coach** | `head_coach` | Supervisión de coaches, métricas globales |
| **Coach** | `coach` | Gestión de sus clientes asignados |
| **Closer** | `closer` | Registro de ventas |
| **Setter** | `setter` | Prospección, leads |
| **Contabilidad** | `contabilidad` | Dashboard financiero, facturas |
| **Endocrino** | `endocrino` | Dashboard médico (si aplica) |
| **Psicólogo** | `psicologo` | Notas de salud mental (si aplica) |
| **RRSS** | `rrss` | Gestión de testimonios |
| **Cliente** | `client` | Portal del alumno |

### 3.2. Personalizar Permisos por Rol

Si necesitas ajustar qué ve cada rol, edita el archivo:

```
utils/permissions.ts
```

Estructura de permisos:

```typescript
export const ROLE_PERMISSIONS = {
  admin: {
    canViewAllClients: true,
    canEditFinancials: true,
    canManageStaff: true,
    canDeleteData: true,
  },
  coach: {
    canViewAllClients: false,  // Solo ve sus clientes
    canEditFinancials: false,
    canManageStaff: false,
    canDeleteData: false,
  },
  // ... otros roles
};
```

---

## 🎨 4. Personalización Visual (Branding)

### 4.1. Colores de Marca

Editar `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Reemplazar con tus colores de marca
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',  // Color principal
          600: '#0284c7',
          700: '#0369a1',
        },
        accent: {
          500: '#f59e0b',  // Color de acento
        },
      },
    },
  },
};
```

### 4.2. Logo e Imágenes

| Archivo | Dimensiones | Uso |
|---------|-------------|-----|
| `public/logo.png` | 200x50px | Header de la app |
| `public/logo-dark.png` | 200x50px | Versión oscura |
| `public/favicon.ico` | 32x32px | Pestaña del navegador |
| `public/og-image.png` | 1200x630px | Compartir en redes |

### 4.3. Textos y Copys

Editar `index.html` para SEO:

```html
<head>
  <title>Tu Negocio - Panel de Gestión</title>
  <meta name="description" content="Descripción de tu servicio para Google">
  <meta property="og:title" content="Tu Negocio">
  <meta property="og:description" content="Descripción para redes sociales">
</head>
```

---

## 📧 5. Configuración de Notificaciones

### 5.1. Webhooks (N8N/Make)

Si usas automatizaciones, configura las URLs:

```sql
INSERT INTO app_settings (key, value, description) VALUES
  -- Webhook principal para nuevas ventas
  ('webhook_new_sale', 'https://n8n.tuservidor.com/webhook/nueva-venta', 'Webhook al registrar venta'),

  -- Webhook para onboarding completado
  ('webhook_onboarding_complete', 'https://n8n.tuservidor.com/webhook/onboarding', 'Webhook al completar alta'),

  -- Webhook para renovaciones
  ('webhook_renewal', 'https://n8n.tuservidor.com/webhook/renovacion', 'Webhook de renovación')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### 5.2. Plantillas de Email

Los textos de emails automáticos se configuran en N8N/Make. Datos típicos a incluir:

- `{{client_name}}` - Nombre del cliente
- `{{coach_name}}` - Coach asignado
- `{{onboarding_link}}` - Enlace de bienvenida
- `{{contract_end_date}}` - Fecha fin de contrato

---

## 📋 6. Plantilla de Contrato

### 6.1. Estructura del Contrato

El contrato se genera automáticamente con estos bloques:

1. **Encabezado**: Datos de la empresa y del cliente
2. **Objeto del contrato**: Descripción del servicio
3. **Duración y precio**: Según el pack contratado
4. **Condiciones de pago**: Métodos aceptados
5. **Protección de datos**: Cláusulas RGPD
6. **Cesión de imagen**: Opcional, para testimonios
7. **Exención de responsabilidad**: Aviso médico
8. **Firma digital**: Fecha y hora

### 6.2. Personalizar Plantilla

```sql
-- La plantilla se guarda en contract_templates
UPDATE contract_templates
SET content = '
# CONTRATO DE PRESTACIÓN DE SERVICIOS

Entre [TU EMPRESA], con CIF [CIF], y el cliente abajo firmante...

## 1. OBJETO DEL CONTRATO
El presente contrato tiene por objeto la prestación de servicios de [DESCRIPCIÓN DE TU SERVICIO]...

## 2. DURACIÓN
El servicio tendrá una duración de {{duration_months}} meses...

## 3. CONDICIONES ECONÓMICAS
El precio total es de {{amount}}€...

[...resto del contrato...]
'
WHERE id = 'default';
```

---

## ✅ 7. Checklist de Configuración Completa

```
┌─────────────────────────────────────────────────────────────────────┐
│ CONFIGURACIÓN DE NEGOCIO - CHECKLIST                                │
├─────────────────────────────────────────────────────────────────────┤
│ DATOS LEGALES                                                       │
│ [ ] Nombre comercial configurado                                    │
│ [ ] Razón social y CIF                                              │
│ [ ] Dirección fiscal                                                │
│ [ ] IBAN para pagos                                                 │
│ [ ] Email y teléfono de contacto                                    │
│                                                                     │
│ PAGOS                                                               │
│ [ ] Links de Hotmart/Stripe creados                                 │
│ [ ] Links añadidos a la tabla payment_links                         │
│ [ ] Comisiones configuradas                                         │
│                                                                     │
│ BRANDING                                                            │
│ [ ] Logo subido (logo.png)                                          │
│ [ ] Favicon actualizado                                             │
│ [ ] Colores de marca en tailwind.config.js                          │
│ [ ] Textos SEO en index.html                                        │
│                                                                     │
│ LEGAL                                                               │
│ [ ] Plantilla de contrato revisada por abogado                      │
│ [ ] Cláusulas RGPD incluidas                                        │
│ [ ] Exención de responsabilidad médica (si aplica)                  │
│ [ ] Política de cancelación definida                                │
│                                                                     │
│ AUTOMATIZACIONES                                                    │
│ [ ] Webhooks de N8N configurados                                    │
│ [ ] Email de bienvenida creado                                      │
│ [ ] Notificaciones a Slack/Telegram (opcional)                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 8. Migrando desde Otro Sistema

Si vienes de Excel, Notion u otro CRM:

### 8.1. Importar Clientes Existentes

```sql
-- Template para importación masiva
INSERT INTO clientes_pt_notion (
  property_nombre,
  property_apellidos,
  property_email,
  property_telefono,
  property_coach,
  property_inicio_programa,
  property_fecha_fin_contrato_actual,
  status
) VALUES
  ('Juan', 'García', 'juan@email.com', '+34600111222', 'coach-uuid', '2025-01-01', '2025-06-30', 'Active'),
  ('María', 'López', 'maria@email.com', '+34600333444', 'coach-uuid', '2025-02-01', '2025-07-31', 'Active')
  -- ... más clientes
;
```

### 8.2. Importar Histórico de Ventas

```sql
INSERT INTO sales (
  client_first_name,
  client_last_name,
  client_email,
  amount,
  contract_duration,
  closer_id,
  assigned_coach_id,
  status,
  created_at
) VALUES
  ('Juan', 'García', 'juan@email.com', 297, 3, 'closer-uuid', 'coach-uuid', 'completed', '2025-01-01'),
  -- ... más ventas
;
```

---

*Documento de configuración - CRM Coaching v1.0*
