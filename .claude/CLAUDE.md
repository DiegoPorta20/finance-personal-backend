# CLAUDE.md — Backend (NestJS)

Este archivo le da contexto a Claude Code cada vez que trabaje en este repositorio. Colócalo en la raíz del proyecto backend.

## Qué es este proyecto

API REST para una app de finanzas personales. Gestiona usuarios, cuentas financieras, ingresos (recurrentes y puntuales), egresos, categorías, presupuestos, metas de ahorro y un motor de recomendaciones de presupuesto. El consumidor de esta API es la app Flutter del mismo producto.

Ver `01-prospecto.md` (compartido entre ambos repos) para el detalle funcional completo.

## Stack tecnológico

- NestJS + TypeScript
- MySQL
- Prisma ORM (provider `mysql`)
- Autenticación con JWT (`@nestjs/jwt` + `passport-jwt`)
- Validación con `class-validator` / `class-transformer`
- Tests con Jest

> Si el proyecto real usa TypeORM en vez de Prisma, actualiza esta sección primero — el resto de las convenciones se mantienen igual.

> Nota MySQL: Prisma soporta MySQL nativamente con `provider = "mysql"` en el bloque `datasource db` de `schema.prisma`. Algunos tipos de Postgres no existen en MySQL (por ejemplo arrays nativos); si alguna entidad los necesitaba, usar `Json` simple o una tabla relacionada en su lugar.

## Estructura de carpetas

```
src/
  modules/
    auth/
    users/
    accounts/
    income-sources/
    transactions/        # ingresos y egresos puntuales
    categories/
    budgets/
    savings-goals/
    analytics/           # endpoints de reportes/estadísticas
  common/
    guards/
    decorators/
    filters/
    pipes/
  prisma/
    schema.prisma
```

## Convenciones del proyecto

- Cada recurso es un módulo independiente (ver skill `nestjs-module-scaffold`).
- Todas las rutas van bajo `/api/v1/...`.
- Toda ruta protegida usa `@UseGuards(JwtAuthGuard)`; el `userId` se obtiene siempre del token, nunca del body/query.
- Las consultas a la base de datos siempre filtran por `userId` — un usuario jamás debe poder leer ni modificar datos de otro.
- Los DTOs validan todos los campos de entrada; nunca confiar en datos del cliente sin validar.
- Errores: usar las excepciones nativas de Nest (`BadRequestException`, `NotFoundException`, etc.) para mantener el formato de respuesta consistente.
- Los montos monetarios se almacenan como enteros en centavos o como `Decimal` de Prisma, nunca como `float`, para evitar errores de redondeo.

## Entidades de dominio clave

`User`, `Account`, `IncomeSource`, `Transaction` (tipo `income`/`expense`), `Category`, `Budget`, `SavingsGoal`, `Notification`.

Para el catálogo exacto de categorías y las reglas del motor de recomendaciones, consultar la skill `finance-domain-conventions` — debe coincidir siempre con lo que usa la app Flutter.

## Endpoints de analytics (motor de reportes)

El módulo `analytics` expone los datos agregados que la app mobile usa para los gráficos:
- gasto por categoría en un rango de fechas
- evolución de ahorro mes a mes
- comparativa ingresos vs. egresos
- estado actual de cada presupuesto (gastado / límite)

Estos endpoints deben hacer la agregación en la base de datos (no traer todas las transacciones y sumarlas en memoria), salvo que el volumen de datos sea muy pequeño.

## Testing

- Cada `service` nuevo necesita al menos un test unitario.
- Los tests de integración de endpoints críticos (auth, transactions) usan una base de datos de test separada, nunca la de desarrollo.

## Comandos habituales

```bash
npm run start:dev          # levantar el servidor en modo desarrollo
npm run test               # tests unitarios
npm run test:e2e           # tests end-to-end
npx prisma migrate dev     # aplicar migraciones en desarrollo
npx prisma studio          # explorar la base de datos
```

## Variables de entorno esperadas

```
DATABASE_URL=mysql://user:password@localhost:3306/finanzas_db
JWT_SECRET=
JWT_EXPIRES_IN=
PORT=
```

## Qué evitar

- No exponer nunca el `passwordHash` u otros campos sensibles en las respuestas (usar DTOs de salida o `select` explícito en Prisma).
- No hacer lógica de negocio dentro de los controllers; los controllers solo orquestan, la lógica va en los services.
- No hardcodear las categorías ni la regla 50/30/20 directamente en el código de cada módulo — centralizarlas según la skill `finance-domain-conventions`.