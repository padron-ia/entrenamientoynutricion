# CRM Coaching Pro

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)
![Supabase](https://img.shields.io/badge/Supabase-Ready-3ecf8e.svg)
![License](https://img.shields.io/badge/license-Commercial-orange.svg)

**CRM completo para academias, coaches y negocios de servicios de acompañamiento**

[Planes y Precios](#-planes-de-servicio) | [Inicio Rapido](#-inicio-rapido-5-minutos) | [Documentacion](./docs/manual_operaciones/)

</div>

---

## Planes de Servicio

| | Self-Service | Gestionado |
|--|:------------:|:----------:|
| **Precio** | 497€ (unico) | 197€ + 47€/mes |
| **Instalacion** | Tu lo haces | Nosotros |
| **Hosting** | Tu lo pagas | Incluido |
| **Actualizaciones** | Manual | Automaticas |
| **Backups** | Tu responsabilidad | Diarios |
| **Soporte** | Documentacion | Prioritario |

**¿No tienes equipo tecnico?** → [Contratar Plan Gestionado](./docs/PLANES_SERVICIO.md)

**¿Prefieres control total?** → Sigue leyendo para instalar tu mismo

---

## Que incluye este producto

Un sistema de gestion completo listo para desplegar en tu propio servidor:

| Modulo | Descripcion |
|--------|-------------|
| **Ventas y Altas** | Registro de clientes con onboarding automatizado y contratos digitales |
| **Dashboard por Roles** | Vistas personalizadas para Admin, Coach, Closer, Contabilidad |
| **Gestion de Clientes** | Ficha completa con seguimiento, metricas y notas |
| **Renovaciones** | Sistema de fases (F1-F5) con alertas automaticas |
| **Facturacion Interna** | Subida y aprobacion de facturas de colaboradores |
| **Portal del Cliente** | Acceso para que tus clientes vean su progreso |
| **Soporte/Tickets** | Sistema de incidencias con chat en tiempo real |
| **Marketing** | Gestion de testimonios y consentimientos |

---

## Inicio Rapido (5 minutos)

### Paso 1: Crea tu cuenta en Supabase (Gratis)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto (nombre: `mi-crm`)
3. Espera 2 minutos a que se aprovisione
4. Ve a **Settings > API** y copia:
   - `Project URL`
   - `anon public key`

### Paso 2: Configura la base de datos

1. En Supabase, ve a **SQL Editor**
2. Copia y pega el contenido de `database/SETUP_COMPLETO.sql`
3. Ejecuta el script (boton "Run")

### Paso 3: Configura el proyecto

```bash
# Clona o descarga el proyecto
cd crm-coaching-pro

# Instala dependencias
npm install

# Configura tus credenciales
cp .env.example .env.local
```

Edita `.env.local` con tus datos:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### Paso 4: Ejecuta

```bash
npm run dev
```

Abre http://localhost:5173 y accede con:
- **Email:** admin@demo.com
- **Password:** 123456

**Listo!** Ya tienes tu CRM funcionando.

---

## Demo

Credenciales de prueba incluidas:

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@demo.com | 123456 |
| Coach | coach@demo.com | 123456 |
| Closer | closer@demo.com | 123456 |

---

## Personalizacion

### Cambiar datos de tu negocio

Edita en Supabase (SQL Editor):

```sql
-- Tus datos de empresa
UPDATE app_settings SET value = 'Tu Negocio SL' WHERE key = 'business_name';
UPDATE app_settings SET value = 'ES00 0000 0000 00' WHERE key = 'business_iban';
-- etc.
```

### Cambiar colores y logo

1. Reemplaza `public/logo.png` con tu logo
2. Edita colores en `tailwind.config.js`

### Guia completa de personalizacion

Ver [docs/manual_operaciones/0B_CONFIGURACION_NEGOCIO.md](./docs/manual_operaciones/0B_CONFIGURACION_NEGOCIO.md)

---

## Despliegue en Produccion

### Flujo real de despliegue: GitHub + EasyPanel

1. Sube el proyecto al repositorio de GitHub
2. EasyPanel debe estar conectado al repositorio y a la rama de producción (`main`)
3. Configura las variables de entorno en EasyPanel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Ejecuta `npm run build` localmente para validar
5. Haz push a `main` para disparar el despliegue automatico en EasyPanel

---

## Estructura del Proyecto

```
crm-coaching-pro/
├── components/          # Componentes React (UI)
├── services/            # Conexion con Supabase
├── database/            # Scripts SQL
│   └── SETUP_COMPLETO.sql  # Script unico de instalacion
├── docs/
│   └── manual_operaciones/  # Documentacion completa
│       ├── 0_GUIA_INSTALACION_PRODUCTO.md
│       ├── 0B_CONFIGURACION_NEGOCIO.md
│       ├── 1_PROCESO_VENTAS_Y_ALTA.md
│       └── ... (14 documentos mas)
├── .env.example         # Plantilla de configuracion
└── README.md            # Este archivo
```

---

## Documentacion Completa

| Documento | Para que sirve |
|-----------|----------------|
| [Guia de Instalacion](./docs/manual_operaciones/0_GUIA_INSTALACION_PRODUCTO.md) | Instalacion detallada paso a paso |
| [Configuracion Negocio](./docs/manual_operaciones/0B_CONFIGURACION_NEGOCIO.md) | Personalizar datos, pagos, branding |
| [Proceso de Ventas](./docs/manual_operaciones/1_PROCESO_VENTAS_Y_ALTA.md) | Como registrar ventas |
| [Manual del Coach](./docs/manual_operaciones/3_GESTION_COACH_Y_SEGUIMIENTO.md) | Uso diario para coaches |
| [Indice Completo](./docs/manual_operaciones/INDICE_PROCESOS.md) | Ver toda la documentacion |

---

## Requisitos Tecnicos

- **Node.js** 18 o superior
- **Supabase** cuenta gratuita o de pago
- **Hosting** EasyPanel (autodeploy desde GitHub)

---

## Soporte

- **Documentacion:** Carpeta `docs/manual_operaciones/`
- **Errores comunes:** Ver [TROUBLESHOOTING.md](./docs/manual_operaciones/TROUBLESHOOTING.md)
- **Incidentes de produccion:** Ver [RUNBOOK_INCIDENTE_PRODUCCION_EASYPANEL.md](./docs/manual_operaciones/RUNBOOK_INCIDENTE_PRODUCCION_EASYPANEL.md)

---

## Stack Tecnologico

| Tecnologia | Uso |
|------------|-----|
| React 19 | Frontend |
| TypeScript | Tipado seguro |
| Tailwind CSS | Estilos |
| Supabase | Base de datos, Auth, Storage |
| Vite | Build tool |
| Recharts | Graficos |

---

<div align="center">

**CRM Coaching Pro** - Sistema de gestion para negocios de coaching y servicios

</div>
