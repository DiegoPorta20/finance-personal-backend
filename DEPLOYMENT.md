# Despliegue — EC2 + docker-compose + GitHub Actions

Arquitectura: una sola instancia EC2 corre `caddy` (HTTPS) → `api` (NestJS) → `mysql`,
todo con docker-compose. GitHub Actions construye la imagen, la sube a GHCR y hace
deploy por SSH a cada push a `main`.

## 1. Crear el EC2

- AMI: **Ubuntu 22.04/24.04 LTS** (o Amazon Linux 2023).
- Tipo: `t3.small` / `t4g.small` (2 GB RAM). `t3.micro` (1 GB) es justo para MySQL + Nest.
- Almacenamiento: 20 GB gp3.
- Security Group (entrada):
  - `22` (SSH) — **solo tu IP**.
  - `80` y `443` (HTTP/HTTPS) — `0.0.0.0/0`.
  - **NO** abras `3306`. MySQL queda solo en la red interna de docker.
- (Recomendado) Asigna una **Elastic IP** para que la IP no cambie al reiniciar.

## 2. Instalar Docker en el EC2

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin awscli
sudo usermod -aG docker $USER && newgrp docker   # usar docker sin sudo
```

## 3. Preparar la carpeta del proyecto en el EC2

```bash
mkdir -p ~/finance-personal && cd ~/finance-personal
```

Copia (scp o git) estos archivos a esa carpeta:
- `docker-compose.prod.yml`
- `Caddyfile`
- `.env.production`  ← créalo a partir de `.env.production.example` con secretos reales

Genera secretos fuertes: `openssl rand -base64 32`

## 4. Dominio y HTTPS

- Apunta un registro A de tu dominio (p. ej. `api.tudominio.com`) a la Elastic IP.
- Pon ese dominio en `Caddyfile`. Caddy emite el certificado Let's Encrypt solo.
- **Sin dominio aún**: comenta el bloque del `Caddyfile`, elimina el servicio `caddy`
  del compose, agrega `ports: ["3000:3000"]` al servicio `api`, y abre el puerto `3000`
  en el Security Group. Entrarás por `http://IP_PUBLICA:3000`.

## 5. Secrets en GitHub (Settings → Secrets and variables → Actions)

| Secret | Qué es |
|---|---|
| `EC2_HOST` | IP pública / Elastic IP del EC2 |
| `EC2_USER` | `ubuntu` (Ubuntu) o `ec2-user` (Amazon Linux) |
| `EC2_SSH_KEY` | Contenido de la **clave privada** SSH (la `.pem`) |
| `GHCR_PAT` | Personal Access Token (classic) con scope `read:packages`, para que el EC2 baje la imagen privada |

> `GITHUB_TOKEN` (push de la imagen en CI) es automático, no hay que crearlo.

## 6. Primer arranque

El workflow corre solo al hacer push a `main`. Para el primer arranque manual en el EC2:

```bash
cd ~/finance-personal
echo "$GHCR_PAT" | docker login ghcr.io -u DiegoPorta20 --password-stdin
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f api
```

El contenedor `api` corre `prisma db push` al arrancar, así que crea las tablas solo.
Para cargar las categorías base (seed), una vez arriba:

```bash
docker compose -f docker-compose.prod.yml exec api npx tsx prisma/seed.ts
```

## 7. Backups (NO opcional — son tus datos financieros)

1. Crea un bucket S3 privado y un **IAM Role** con `s3:PutObject` sobre ese bucket;
   adjúntalo al EC2 (Instance Profile). Así no guardas access keys.
2. Copia `scripts/backup-db.sh` al EC2 y dale permisos: `chmod +x ~/finance-personal/scripts/backup-db.sh`
3. Programa el cron diario (3am):

```bash
crontab -e
# añade:
0 3 * * * BACKUP_BUCKET=s3://TU-BUCKET/finanzas DB_NAME=finanzas_db /home/ubuntu/finance-personal/scripts/backup-db.sh >> /home/ubuntu/backup.log 2>&1
```

4. Activa una **lifecycle rule** en el bucket para borrar backups > 30 días.

## Notas / deuda técnica

- `package.json` → `start:prod` apunta a `node dist/main` pero el build sale en
  `dist/src/main.js`. El contenedor usa la ruta correcta; conviene arreglar el script.
- Cuando el esquema se estabilice, migra de `prisma db push` a migraciones reales
  (`prisma migrate dev` en local → `prisma migrate deploy` en el entrypoint).
- Para mayor seguridad puedes reemplazar el deploy por SSH con AWS SSM (sin abrir el
  puerto 22), usando OIDC en GitHub Actions en vez de la clave SSH.
