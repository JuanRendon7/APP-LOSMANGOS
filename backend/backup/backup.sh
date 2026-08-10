#!/bin/sh
set -e

FECHA=$(date +%Y-%m-%d)
ARCHIVO="backup-hotel-mangos-${FECHA}.sql.gz"
DUMP="/tmp/${ARCHIVO}"
PAYLOAD="/tmp/payload.json"

echo "Generando dump de la base de datos..."
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$DUMP"

ADJUNTO=$(base64 -w0 "$DUMP")

{
  printf '{"from":"Hotel Los Mangos <onboarding@resend.dev>","to":["%s"],"subject":"Backup base de datos - %s","text":"Backup automatico de la base de datos de Hotel Los Mangos, adjunto en formato .sql.gz","attachments":[{"filename":"%s","content":"' \
    "$BACKUP_EMAIL_TO" "$FECHA" "$ARCHIVO"
  printf '%s' "$ADJUNTO"
  printf '"}]}'
} > "$PAYLOAD"

echo "Enviando backup a ${BACKUP_EMAIL_TO}..."
HTTP_CODE=$(curl -sS -o /tmp/respuesta.json -w "%{http_code}" -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer ${RESEND_API_KEY}" \
  -H "Content-Type: application/json" \
  --data @"$PAYLOAD")

cat /tmp/respuesta.json
echo

if [ "$HTTP_CODE" -ge 400 ]; then
  echo "Error enviando el backup (HTTP ${HTTP_CODE})"
  exit 1
fi

echo "Backup enviado correctamente a ${BACKUP_EMAIL_TO}"
