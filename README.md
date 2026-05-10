# HR EVA

社労士監修の人事評価＋パルスサーベイ SaaS（マルチテナント）。

## スタック
- Next.js 16 (App Router) + TypeScript
- Prisma 7 + PostgreSQL 16
- NextAuth v5 (Credentials)
- Tailwind CSS v4

## ロール
- `SUPER_ADMIN` 運営
- `SR_ADMIN` 社労士
- `CLIENT_ADMIN` クライアント企業管理者
- `EMPLOYEE` 従業員

## セットアップ

```bash
# Postgres 16 起動 (初回のみ)
brew services start postgresql@16

# 依存インストール
npm install

# DB マイグレーション + シード
npm run db:migrate
npm run db:seed

# 開発サーバー起動 (port 3014)
npm run dev
```

## デモアカウント (password: `password123`)
- `admin@example.com` Super Admin
- `sr@example.com` 社労士
- `client@example.com` クライアント管理者
- `employee@example.com` 従業員

## スクリプト
- `npm run dev` 開発サーバー
- `npm run db:migrate` マイグレーション
- `npm run db:generate` Prisma クライアント生成
- `npm run db:seed` シード投入
- `npm run db:studio` Prisma Studio (DB GUI)
