# HR EVA 本番デプロイ手順書

## アーキテクチャ
```
[ユーザー] → Vercel (Next.js, Edge proxy) → Neon (PostgreSQL serverless)
                                           → Resend (メール、テナントAPI鍵で上書き可)
```

## 前提
- GitHub アカウント
- Vercel アカウント (Hobby プランで OK、ピーク時のみ Pro 検討)
- Neon アカウント (Free プランで 0.5GB / 100h compute / 月)
- Resend アカウント (月3,000通まで無料)

## デプロイ手順

### 1. リポジトリを GitHub にプッシュ
```bash
cd /Users/matsuoyasuhiro/Desktop/claud/hr-evaluation-system
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin git@github.com:YOUR_ORG/hr-eva.git
git push -u origin main
```

### 2. Neon でデータベース作成
1. https://neon.tech にログイン
2. `New Project` → Region: **AWS Tokyo (ap-northeast-1)**
3. Database name: `hr_eva`
4. 作成後、`Connection string` (Pooled connection) をコピー
   - 形式: `postgresql://USER:PASS@ep-xxxx.ap-northeast-1.aws.neon.tech/hr_eva?sslmode=require`

### 3. シークレット値を生成
```bash
./scripts/generate-secrets.sh
```
出力された AUTH_SECRET / ENCRYPTION_KEY / SEED_ADMIN_PASSWORD を控える。

### 4. Vercel にプロジェクト作成
1. https://vercel.com → `Add New` → `Project` → GitHub リポジトリを選択
2. **Framework Preset**: Next.js（自動検出）
3. **Build Command**: `prisma generate && next build`（vercel.json で自動設定済み）
4. **Environment Variables** に以下を設定（Production スコープ）:

| Key | Value |
|---|---|
| `DATABASE_URL` | Neon の Connection string |
| `AUTH_SECRET` | `openssl rand -base64 32` の出力 |
| `AUTH_URL` | デプロイ後の URL（例: `https://hr-eva.vercel.app`） |
| `AUTH_TRUST_HOST` | `true` |
| `ENCRYPTION_KEY` | `openssl rand -base64 48` の出力 ⚠️ **絶対に変えない** |
| `RESEND_API_KEY` | （任意）テナント別未設定時のフォールバック |
| `MAIL_FROM` | `HR EVA <noreply@your-domain.com>` |
| `NODE_ENV` | `production`（自動設定） |

5. `Deploy` をクリック

### 5. データベース構築
ローカルから Neon の本番DBにマイグレーションを流す:
```bash
DATABASE_URL="postgresql://USER:PASS@ep-xxxx.../hr_eva?sslmode=require" \
  npm run db:migrate:deploy
```

### 6. Super Admin の初期登録
```bash
DATABASE_URL="postgresql://..." \
SEED_ADMIN_EMAIL="admin@your-domain.com" \
SEED_ADMIN_PASSWORD="生成した初期パスワード" \
SEED_ADMIN_NAME="システム管理者" \
  npm run db:seed:prod
```

### 7. 動作確認
1. ヘルスチェック: `https://hr-eva.vercel.app/api/health` → `{"status":"ok",...}`
2. ログイン画面: `https://hr-eva.vercel.app/login`
3. Super Admin で初回ログイン
4. **すぐにパスワードを変更**（次回フェーズで Super Admin パスワード変更画面を実装予定）
5. `/admin/tenants/new` から最初の社労士テナントを作成

### 8. テナント別 API キーの登録
新規作成した社労士テナントの SR_ADMIN がログインしたら:
- `/sr/settings/api-keys` で Resend / Slack / OpenAI 等の API キーを登録
- AES-256-GCM で暗号化保存され、画面では再表示不可

## ⚠️ 運用上の重要事項

### `ENCRYPTION_KEY` の取り扱い
- **絶対に変更しないこと**。変更すると既存の暗号化済み API キーが復号できなくなる
- Vercel の Environment Variables から削除されないよう、別途オフラインメモを推奨
- ローテーションが必要な場合は、再暗号化スクリプト（未実装）を別途作成

### バックアップ
- Neon は自動バックアップあり（Free: 7日、Pro: 30日）
- 重要な変更前は Neon ダッシュボードで Branch（スナップショット）を作成
- 月1で `pg_dump` を手動でも取得推奨

### スケール時の検討事項
| 規模 | 推奨アップグレード |
|---|---|
| 〜10社・100名 | Vercel Hobby + Neon Free（月¥0） |
| 〜50社・1,000名 | Vercel Pro($20/月) + Neon Launch($19/月) |
| 〜200社・10,000名 | Vercel Pro + Neon Scale($69/月〜) + Resend Pro($20/月) |

### モニタリング
- Vercel Analytics（標準）で Web Vitals 監視
- UptimeRobot 等で `/api/health` を 5 分ごとに監視
- Neon ダッシュボードで DB の Storage / Compute をウォッチ

## トラブルシューティング

### ログインできない
- `AUTH_URL` が実際のデプロイ URL と一致しているか確認
- `AUTH_TRUST_HOST=true` が設定されているか
- `AUTH_SECRET` が16文字以上あるか

### 「ENCRYPTION_KEY environment variable is missing」
- Vercel の Environment Variables に `ENCRYPTION_KEY` が設定されているか
- Preview / Production 両方のスコープに設定する

### マイグレーション失敗
- `DATABASE_URL` の `?sslmode=require` が付いているか
- Neon の Connection が IP 制限されていないか

## 次の運用改善（未実装）
- [ ] パスワードリセット機能
- [ ] 監査ログ（ログイン履歴・変更履歴）
- [ ] Resend 以外（Slack/LINE/ChatWork）への通知統合
- [ ] バックアップ自動化（Vercel Cron + S3）
- [ ] Sentry 等のエラートラッキング
