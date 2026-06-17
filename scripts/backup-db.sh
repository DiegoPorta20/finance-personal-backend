#!/bin/sh
# Backup diario de MySQL a S3. Corre EN EL EC2 via cron.
# Requisitos en el EC2:
#   - aws cli instalado
#   - el EC2 con un IAM Role que permita s3:PutObject en el bucket (NO uses keys)
#   - exporta DB_NAME, DB_PASSWORD y BACKUP_BUCKET (o pon valores aqui)
set -e

DB_NAME="${DB_NAME:-finanzas_db}"
BACKUP_BUCKET="${BACKUP_BUCKET:-s3://TU-BUCKET-DE-BACKUPS/finanzas}"
TS="$(date +%Y-%m-%d-%H%M)"

echo "[backup] Dump de ${DB_NAME} -> ${BACKUP_BUCKET}/finanzas-${TS}.sql.gz"

docker exec finanzas-mysql sh -c \
  "exec mysqldump -uroot -p\"\$MYSQL_ROOT_PASSWORD\" --single-transaction --routines --triggers ${DB_NAME}" \
  | gzip \
  | aws s3 cp - "${BACKUP_BUCKET}/finanzas-${TS}.sql.gz"

echo "[backup] Listo."
