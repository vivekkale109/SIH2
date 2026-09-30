#!/usr/bin/env bash
# Generates Ed25519 keypair for court-admissible signed export packages (BSA 2023 §61–63)
set -euo pipefail

KEY_DIR="${1:-./secrets}"
mkdir -p "$KEY_DIR"
chmod 700 "$KEY_DIR"

echo "Generating Ed25519 private key..."
openssl genpkey -algorithm ed25519 -out "$KEY_DIR/export_signing_private.pem"
chmod 600 "$KEY_DIR/export_signing_private.pem"

echo "Extracting public key..."
openssl pkey -in "$KEY_DIR/export_signing_private.pem" -pubout -out "$KEY_DIR/export_signing_public.pem"

echo "Keypair generated successfully at: $KEY_DIR"
echo "Set EXPORT_SIGNING_PRIVATE_KEY and EXPORT_SIGNING_PUBLIC_KEY in .env"
