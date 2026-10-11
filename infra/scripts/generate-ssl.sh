#!/usr/bin/env bash
# Generates self-signed TLS/SSL certificate for SDMS local production testing
set -euo pipefail

CERT_DIR="${1:-./infra/nginx/certs}"
mkdir -p "$CERT_DIR"

echo "Generating self-signed TLS certificate for SDMS Production Nginx..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/sdms.key" \
  -out "$CERT_DIR/sdms.crt" \
  -subj "/C=IN/ST=Delhi/L=New Delhi/O=SDMS/OU=Cybersecurity/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

chmod 600 "$CERT_DIR/sdms.key"
chmod 644 "$CERT_DIR/sdms.crt"

echo "TLS certificates successfully generated in: $CERT_DIR"
