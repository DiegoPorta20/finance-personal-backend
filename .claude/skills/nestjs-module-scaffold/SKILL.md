---
name: nestjs-module-scaffold
description: Usar esta skill cuando se necesite crear un nuevo módulo de recurso en el backend NestJS (ej. "crea el módulo de Income", "agrega el CRUD de SavingsGoal"). Genera entidad/modelo Prisma, DTOs con validación, controller, service y test unitario siguiendo siempre la misma estructura del proyecto.
---

# NestJS Module Scaffold

## Cuándo se activa

Cualquier pedido de crear, agregar o generar un nuevo recurso/módulo en el backend: "crea el módulo de X", "agrega el endpoint de Y", "necesito el CRUD de Z".

## Estructura a generar

Para un recurso `Resource` (ej. `Income`, `Expense`, `SavingsGoal`), crear siempre:

```
src/modules/resource/
  resource.module.ts
  resource.controller.ts
  resource.service.ts
  dto/create-resource.dto.ts
  dto/update-resource.dto.ts
  entities/resource.entity.ts        (si no se usa Prisma directo)
  resource.service.spec.ts
```

Y agregar el modelo correspondiente en `prisma/schema.prisma` si la entidad es nueva.

## Convenciones obligatorias

- Los DTO usan `class-validator` (`@IsString`, `@IsNumber`, `@IsOptional`, etc.) y `class-transformer`.
- El controller expone rutas bajo `/api/v1/<recurso-en-plural>` y usa `@UseGuards(JwtAuthGuard)` salvo que se indique lo contrario.
- El service nunca accede a `req`/`res` directamente; recibe solo los datos que necesita.
- Toda relación con `userId` se filtra siempre por el usuario autenticado (nunca devolver datos de otro usuario).
- Las respuestas de error siguen el formato `{ statusCode, message, error }` ya usado en el resto del proyecto.
- Cada service nuevo debe tener al menos un test unitario que mockee el cliente de Prisma.

## Ejemplo de DTO esperado

```typescript
export class CreateExpenseDto {
  @IsNumber()
  amount: number;

  @IsString()
  categoryId: string;

  @IsString()
  accountId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  note?: string;
}
```

## Después de generar

Recordar:
1. Registrar el nuevo módulo en `app.module.ts`.
2. Ejecutar `npx prisma migrate dev` si se modificó el schema.
3. Sugerir al usuario correr `npm run test` antes de continuar.
