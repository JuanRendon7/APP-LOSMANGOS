# syntax=docker/dockerfile:1

FROM postgres:17-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY backup.sh .
RUN chmod +x backup.sh
CMD ["./backup.sh"]
