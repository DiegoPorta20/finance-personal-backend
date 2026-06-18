---
name: finance-domain-conventions
description: Consultar esta skill siempre que se trabaje con categorías de ingresos/egresos, formato de moneda, o las reglas del motor de recomendaciones de ahorro/presupuesto, tanto en el backend NestJS como en la app Flutter. Garantiza que ambos repositorios usen exactamente las mismas categorías, ids y reglas de negocio.
---

# Finance Domain Conventions

## Por qué existe esta skill

El backend y la app mobile deben coincidir exactamente en las categorías, sus ids y las reglas de presupuesto. Si cada repositorio las define por separado se desincronizan. Esta skill es la fuente única de verdad mientras no exista un paquete compartido de tipos.

## Categorías de egresos (catálogo base)

| id | nombre | ícono sugerido |
|---|---|---|
| `housing` | Vivienda | home |
| `food` | Alimentación | restaurant |
| `transport` | Transporte | directions_car |
| `entertainment` | Entretenimiento | movie |
| `health` | Salud | local_hospital |
| `debts` | Deudas | credit_card |
| `subscriptions` | Suscripciones | autorenew |
| `education` | Educación | school |
| `other_expense` | Otros | more_horiz |

## Categorías de ingresos (catálogo base)

| id | nombre |
|---|---|
| `salary` | Sueldo fijo |
| `freelance` | Freelance |
| `rent_income` | Renta |
| `investment` | Inversiones |
| `other_income` | Otros |

Al agregar una categoría nueva, debe reflejarse en ambos repos en el mismo PR/sesión (seed de Prisma en backend, enum/lista en Flutter).

## Formato de moneda

- Siempre mostrar el símbolo de moneda configurado por el usuario (`Account.currency`), nunca asumir USD por defecto en la UI.
- Formato: `$#,##0.00` (separador de miles con coma, 2 decimales).

## Regla de presupuesto por defecto (50/30/20)

- 50% del ingreso mensual total → categorías esenciales (`housing`, `food`, `transport`, `health`, `debts`).
- 30% → categorías de estilo de vida (`entertainment`, `subscriptions`, `education`, `other_expense`).
- 20% → ahorro (`SavingsGoal` o saldo libre).

Esta distribución es el valor por defecto; el usuario puede sobreescribirla por categoría en `Budget`. Cualquier lógica de alertas (gasto excedido, sugerencia de ahorro) debe calcularse siempre contra el `Budget` efectivo del usuario, no contra el 50/30/20 hardcodeado, salvo que el usuario no haya configurado nada todavía.

## Al modificar esta skill

Si cambian las categorías o la regla de presupuesto, actualizar este archivo primero y luego propagar el cambio a backend y mobile en la misma sesión de trabajo.
