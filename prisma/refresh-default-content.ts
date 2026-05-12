/**
 * 既存DBの「Nice-one」表記と社労士業務特化の文言を、汎用版に置き換えるワンタイム更新スクリプト。
 * - 評価テンプレート description: Nice-one ベース → 汎用文言
 * - 評価項目「顧客対応・折衝」→「対応力（顧客・社内）」（id: demo-item-customer / mock-item-customer 両方）
 * - 等級2の description から「定期訪問や折衝」表現を除去
 *
 * 実行:
 *   DATABASE_URL="..." npx tsx prisma/refresh-default-content.ts
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const NEW_TEMPLATE_DESCRIPTION =
  "半期ごとの行動・成果を絶対評価で測定する標準テンプレート。各項目は5段階評価＋面談用の質問例つき。";

const NEW_CUSTOMER_ITEM = {
  name: "対応力（顧客・社内）",
  description: "お客様や社内関係者からの依頼・問合せに迅速かつ的確に対応できたか",
  interviewPoint:
    "・特に喜ばれた／指摘を受けたエピソードを共有する\n・対応プロセスでうまく回せている工夫を言語化する\n・次の半期で改善・強化したいテーマを擦り合わせる",
  interviewQuestions:
    "・この半期で印象に残った対応はありますか？\n・相手から学んだこと、改善のヒントを得たことは？\n・次の半期で「ここを伸ばしたい」というテーマがあれば教えてください。",
};

const NEW_CUSTOMER_LEVELS: Array<{ score: number; description: string }> = [
  { score: 5, description: "相手のニーズを的確に汲み取り、期待を上回る対応を継続し、深い信頼関係を築いた" },
  { score: 4, description: "丁寧で迅速な対応により評価を得る場面が多く、信頼関係を築けていた" },
  { score: 3, description: "求められる対応を行い、特段の問題は発生しなかった" },
  { score: 2, description: "対応が受身的で、指摘を受ける場面があった" },
  { score: 1, description: "対応に問題があり、強い指摘やクレームを受けた" },
];

const NEW_GRADE2_DESCRIPTION =
  "標準的な業務を独力で遂行できる。担当領域や担当顧客の対応を行える。";

async function main() {
  console.log("Refreshing default content...\n");

  // 1. テンプレート description 更新（"Nice-one" 表記の入っているものを置換）
  const updatedTemplates = await prisma.evaluationTemplate.updateMany({
    where: {
      OR: [
        { description: { contains: "Nice-one" } },
        { description: { contains: "Nice‐one" } },
      ],
    },
    data: { description: NEW_TEMPLATE_DESCRIPTION },
  });
  console.log(`✓ Templates description updated: ${updatedTemplates.count}`);

  // 2. 顧客対応項目を汎用版に置換（既知ID）
  for (const itemId of ["demo-item-customer", "mock-item-customer"]) {
    const item = await prisma.evaluationTemplateItem.findUnique({
      where: { id: itemId },
    });
    if (!item) continue;
    await prisma.evaluationTemplateItem.update({
      where: { id: itemId },
      data: NEW_CUSTOMER_ITEM,
    });
    console.log(`✓ Item updated: ${itemId}`);

    // レベル定義も差し替え
    for (const lv of NEW_CUSTOMER_LEVELS) {
      await prisma.evaluationItemLevel.upsert({
        where: { itemId_score: { itemId, score: lv.score } },
        update: { description: lv.description },
        create: { itemId, score: lv.score, description: lv.description },
      });
    }
    console.log(`  └ Levels refreshed for ${itemId}`);
  }

  // 3. 名前が「顧客対応・折衝」の項目があれば一律改名（IDが違う場合への保険）
  const renamed = await prisma.evaluationTemplateItem.updateMany({
    where: { name: "顧客対応・折衝" },
    data: {
      name: NEW_CUSTOMER_ITEM.name,
      description: NEW_CUSTOMER_ITEM.description,
      interviewPoint: NEW_CUSTOMER_ITEM.interviewPoint,
      interviewQuestions: NEW_CUSTOMER_ITEM.interviewQuestions,
    },
  });
  console.log(`✓ Other "顧客対応・折衝" items renamed: ${renamed.count}`);

  // 4. 等級2の description が定期訪問・折衝表現を含むものを置換
  const grade2Update = await prisma.grade.updateMany({
    where: {
      rank: 2,
      OR: [
        { description: { contains: "定期訪問" } },
        { description: { contains: "折衝" } },
      ],
    },
    data: { description: NEW_GRADE2_DESCRIPTION },
  });
  console.log(`✓ Grade 2 descriptions updated: ${grade2Update.count}`);

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
