# 🔐 Credenciales de Prueba del Sistema

Este archivo contiene los usuarios de prueba configurados en la base de datos que **tienen datos precargados** (ventas, clientes, historial) para verificar el funcionamiento correcto del Dashboard.

## ⚠️ IMPORTANTE
No uses usuarios genéricos como `closer_test@academia.com` para probar el dashboard, ya que **no tienen ventas asignadas** y verás el panel vacío o con errores. Usa los siguientes usuarios:

## 💼 Closers y Setters (Ventas y Dashboard)

| Usuario | Contraseña | Perfil | Rol | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **`direccion@test.com`** | `admin123` | Dirección Test | Dirección | ✅ Métricas globales |
| **`closer@test.com`** | `admin123` | María Closer | Closer | ✅ Ventas activas |
| **`closer2@test.com`** | `admin123` | Carlos Ventas | Closer | ✅ Ventas y comisiones |
| **`setter@test.com`** | `admin123` | Sofía Setter | Setter | ✅ Leads y agenda |

## 👨‍🏫 Coaches y Profesionales

| Usuario | Contraseña | Rol | Perfil |
| :--- | :--- | :--- | :--- |
| **`nutricionista@test.com`** | `admin123` | Nutricionista | Ana (8 clientes) |
| **`psicologo@test.com`** | `admin123` | Psicólogo | Pedro (5 clientes) |
| **`rrss@test.com`** | `admin123` | RRSS | Sofía |
| **`coach.completo@test.com`** | `admin123` | Coach | Luis |

## 🛠️ Administrador

| Usuario | Contraseña | Rol |
| :--- | :--- | :--- |
| **`admin@demo.com`** | `admin123` | Administrador Total |

---

### Solución si ves la pantalla en blanco
Si has intentado entrar con otro correo y la pantalla se queda en blanco o cargando infinitamente:
1. Cierra sesión o borra las cookies/storage del navegador.
2. Usa **`closer@test.com`** (contraseña: `test123`).
3. Este usuario tiene ventas asignadas en la base de datos (IDs ficticios) que permitirán que los gráficos se calculen correctamente.
