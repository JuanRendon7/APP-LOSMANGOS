#!/bin/sh
set -eu

FECHA=$(date +%Y-%m-%d)
ARCHIVO="backup-hotel-mangos-${FECHA}.sql.gz"
DUMP="/tmp/${ARCHIVO}"
PAYLOAD="/tmp/payload.json"
RESPUESTA="/tmp/respuesta.json"

: "${DATABASE_URL:?falta DATABASE_URL}"
: "${RESEND_API_KEY:?falta RESEND_API_KEY}"
: "${BACKUP_EMAIL_TO:?falta BACKUP_EMAIL_TO}"

echo "Generando dump de la base de datos..."
pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$DUMP"
echo "Dump generado: $(wc -c < "$DUMP") bytes"

ADJUNTO=$(base64 -w0 "$DUMP")
echo "Adjunto codificado: ${#ADJUNTO} caracteres"

{
  printf '{"from":"Hotel Los Mangos <onboarding@resend.dev>","to":["%s"],"subject":"Backup base de datos - %s","text":"Backup automatico de la base de datos de Hotel Los Mangos, adjunto en formato .sql.gz","attachments":[{"filename":"%s","content":"' \
    "$BACKUP_EMAIL_TO" "$FECHA" "$ARCHIVO"
  printf '%s' "$ADJUNTO"
  printf '"}]}'
} > "$PAYLOAD"
echo "Payload generado: $(wc -c < "$PAYLOAD") bytes"

echo "Enviando backup a ${BACKUP_EMAIL_TO}..."
set +e
HTTP_CODE=$(curl -sS --max-time 120 -o "$RESPUESTA" -w "%{http_code}" -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer ${RESEND_API_KEY}" \
  -H "Content-Type: application/json" \
  --data @"$PAYLOAD")
CURL_EXIT=$?
set -e

echo "curl exit code: ${CURL_EXIT}"
echo "HTTP status: ${HTTP_CODE:-<vacio>}"
if [ -f "$RESPUESTA" ]; then
  echo "Respuesta de Resend:"
  cat "$RESPUESTA"
  echo
fi

if [ "$CURL_EXIT" -ne 0 ]; then
  echo "ERROR: curl fallo con codigo ${CURL_EXIT} (problema de red/DNS/TLS)"
  exit 1
fi

case "$HTTP_CODE" in
  ''|*[!0-9]*)
    echo "ERROR: no se recibio un codigo HTTP numerico valido"
    exit 1
    ;;
esac

if [ "$HTTP_CODE" -ge 400 ]; then
  echo "ERROR: Resend respondio HTTP ${HTTP_CODE}"
  exit 1
fi

echo "Backup enviado correctamente a ${BACKUP_EMAIL_TO}"
