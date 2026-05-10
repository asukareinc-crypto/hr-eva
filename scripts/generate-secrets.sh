#!/usr/bin/env bash
# 本番環境用のシークレット値を生成して表示する。
# 出力された値を Vercel の Environment Variables に貼り付けて使う。
#
# 使い方:
#   ./scripts/generate-secrets.sh

set -euo pipefail

echo "================================================================"
echo "  HR EVA — 本番環境シークレット生成"
echo "================================================================"
echo ""
echo "以下の値を Vercel の Environment Variables にコピーしてください。"
echo "（本ファイルは保存しないこと）"
echo ""
echo "AUTH_SECRET=$(openssl rand -base64 32)"
echo ""
echo "ENCRYPTION_KEY=$(openssl rand -base64 48)"
echo ""
echo "================================================================"
echo "推奨初期 Super Admin パスワード（手動でも可）:"
echo ""
echo "SEED_ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
echo "================================================================"
