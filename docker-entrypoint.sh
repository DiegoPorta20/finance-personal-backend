#!/bin/sh
set -e

# Aplica el esquema a la base de datos antes de arrancar.
# Usamos `db push` porque el proyecto aun no tiene carpeta prisma/migrations.
# Cuando migres a flujo de migraciones, cambia esto por: npx prisma migrate deploy
echo "[entrypoint] Aplicando esquema (prisma db push)..."
npx prisma db push

echo "[entrypoint] Iniciando API..."
exec node dist/src/main.js
