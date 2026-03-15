# Checklist de Instalacion - CRM Coaching Pro

Imprime esta pagina y marca cada paso completado.

---

## FASE 1: PREPARACION

### Cuentas necesarias
```
[ ] Cuenta en Supabase creada (supabase.com)
[ ] Repositorio en GitHub creado
[ ] Proyecto creado en EasyPanel
[ ] Dominio propio (opcional)
```

### Credenciales obtenidas
```
[ ] Supabase Project URL: ________________________________
[ ] Supabase Anon Key: __________________________________
[ ] (Opcional) API Key Gemini: ___________________________
```

---

## FASE 2: BASE DE DATOS

### Ejecucion de SQL
```
[ ] Proyecto creado en Supabase
[ ] Esperado 2 minutos a que se aprovisione
[ ] Abierto SQL Editor
[ ] Copiado contenido de SETUP_COMPLETO.sql
[ ] Ejecutado script (boton Run)
[ ] Verificado mensaje "Success"
```

### Verificacion de tablas
```
[ ] Tabla 'users' creada
[ ] Tabla 'clientes_pt_notion' creada
[ ] Tabla 'sales' creada
[ ] Tabla 'app_settings' creada
```

### Storage (crear manualmente si fallo)
```
[ ] Bucket 'documents' creado
[ ] Bucket 'receipts' creado
[ ] Bucket 'contracts' creado
[ ] Bucket 'invoices' creado
[ ] Bucket 'avatars' creado (publico)
```

---

## FASE 3: APLICACION

### Configuracion local
```
[ ] Node.js 18+ instalado
[ ] Repositorio clonado/descargado
[ ] npm install ejecutado sin errores
[ ] Archivo .env.local creado
[ ] Variables de entorno configuradas
```

### Primera ejecucion
```
[ ] npm run dev ejecutado
[ ] App abre en http://localhost:5173
[ ] No hay errores en consola
```

---

## FASE 4: USUARIOS

### Usuario Admin
```
[ ] Usuario creado en Supabase Authentication
    Email: ________________________________
[ ] Login funciona en la app
[ ] Dashboard se muestra correctamente
[ ] Rol aparece como 'admin'
```

### Usuarios adicionales (opcional)
```
[ ] Coach creado - Email: ___________________________
[ ] Closer creado - Email: __________________________
[ ] Contabilidad creado - Email: ____________________
```

---

## FASE 5: PERSONALIZACION

### Datos del negocio
```
[ ] Nombre comercial configurado
[ ] Razon social y CIF
[ ] IBAN para pagos
[ ] Email y telefono de contacto
```

### Branding
```
[ ] Logo subido (public/logo.png)
[ ] Favicon actualizado
[ ] Colores de marca configurados
```

### Pagos
```
[ ] Links de pago creados (Hotmart/Stripe)
[ ] Links añadidos a payment_links
```

---

## FASE 6: PRODUCCION

### Despliegue
```
[ ] Repositorio subido a GitHub
[ ] App conectada al repo en EasyPanel
[ ] Rama de despliegue en EasyPanel = main
[ ] Variables de entorno configuradas en EasyPanel
[ ] Build completado sin errores
[ ] App funciona en URL de produccion
```

### Dominio (opcional)
```
[ ] Dominio apuntado a EasyPanel
[ ] SSL/HTTPS funcionando
```

---

## FASE 7: PRUEBA FINAL

### Test completo del flujo
```
[ ] Crear venta de prueba
[ ] Enlace de onboarding generado
[ ] Cliente puede completar onboarding
[ ] Cliente aparece en dashboard del coach
[ ] Subida de archivos funciona
[ ] Notificaciones funcionan
```

---

## COMPLETADO

```
Fecha de instalacion: ____/____/________

Instalado por: _________________________________

Notas: _________________________________________
________________________________________________
________________________________________________
```

---

## Contacto de soporte

En caso de problemas, documentar:
- Error exacto (captura de pantalla)
- Paso donde ocurrio
- Navegador y version

Ver: TROUBLESHOOTING.md para errores comunes
