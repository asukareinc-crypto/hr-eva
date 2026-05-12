/**
 * 顧客提案用モックアップデータを投入するスクリプト。
 * 既存の本番データには影響を与えないよう、独立した ID 接頭辞「mock-」を使う。
 * 同じパスワードで何度実行しても安全（upsert）。
 *
 * 実行:
 *   DATABASE_URL="..." npx tsx prisma/seed-mockup-demo.ts
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "Demo2026!";

// 評価項目（Nice-one ベース、本番 seed と同じ）
const TEMPLATE_ITEMS = [
  {
    id: "mock-item-rule",
    name: "規律性",
    description: "上司の指示・命令や諸規則を守り、職場の秩序向上に努めていたか",
    interviewPoint:
      "・指示や規則を守れている具体的な場面を本人と共有する\n・守りにくいと感じた場面の背景を聞き取る\n・他のメンバーの模範となれている部分があれば具体的に伝える",
    interviewQuestions:
      "・自分が職場のルールを守れていると感じた場面はありますか？\n・逆に、ルールが守りづらいと感じた場面はありましたか？\n・他のメンバーの行動で「これは見習いたい」と思ったことは？",
    weight: 2,
    sortOrder: 1,
    levels: [
      { score: 5, description: "諸規則や上司の指示の内容をよく理解し、自ら進んで守るとともに、他の者の良い模範となっていた" },
      { score: 4, description: "諸規則や上司の指示は定められたとおり守っており、他の者にも良い影響があった" },
      { score: 3, description: "諸規則や上司の指示に違反することはほとんどなく、職場の秩序を乱すことはなかった" },
      { score: 2, description: "諸規則や指示にやや無関心なところがあり、時々守られていないことがあった" },
      { score: 1, description: "諸規則や指示に反する行為が見られ、注意しても繰り返すことがあった" },
    ],
  },
  {
    id: "mock-item-quality",
    name: "正確性・品質",
    description: "業務を正確かつ高品質に遂行できたか（責任感、ミスの少なさ、品質追求）",
    interviewPoint:
      "・期間中のミス・ヒヤリハットの種類と原因を振り返る\n・ダブルチェック等の工夫を共有\n・品質向上のための今後の挑戦を聞く",
    interviewQuestions:
      "・この半期で、自分の仕事の品質に満足できた場面はありますか？\n・ミスやヒヤリハットがあった時、原因は何だったと思いますか？\n・品質を上げるために取り入れたい工夫はありますか？",
    weight: 3,
    sortOrder: 2,
    levels: [
      { score: 5, description: "ミスがなく、品質の高い仕事を継続して提供。他者の参考となる工夫も見られた" },
      { score: 4, description: "高い品質で業務を遂行し、ミスも少なく、信頼できるレベルだった" },
      { score: 3, description: "求められる品質を維持し、業務上問題となるミスはなかった" },
      { score: 2, description: "ミスがやや多く、確認が不十分なことがあった" },
      { score: 1, description: "ミスが頻発し、業務に支障をきたした" },
    ],
  },
  {
    id: "mock-item-customer",
    name: "顧客対応・折衝",
    description: "お客様への定期訪問・折衝・満足度向上に積極的に取り組んだか",
    interviewPoint: "・印象に残った顧客対応エピソードを共有\n・定期訪問の運用プロセスを言語化\n・次期の深堀テーマを擦り合わせる",
    interviewQuestions: "・印象に残ったお客様対応はありますか？\n・お客様から学んだことは？\n・次の半期で深めたいテーマは？",
    weight: 3,
    sortOrder: 3,
    levels: [
      { score: 5, description: "顧客満足度を強く意識し、自ら提案・改善を行うとともに信頼関係を深く築いた" },
      { score: 4, description: "丁寧な対応により顧客から評価を得る場面が多く、信頼関係を築けていた" },
      { score: 3, description: "求められる顧客対応を行い、特段の問題は発生しなかった" },
      { score: 2, description: "対応が受身的で、顧客から指摘を受ける場面があった" },
      { score: 1, description: "対応に問題があり、顧客から強い指摘・クレームを受けた" },
    ],
  },
  {
    id: "mock-item-cooperation",
    name: "協調性・チームワーク",
    description: "社内での協力体制づくりに貢献したか（情報共有、後輩支援等）",
    interviewPoint: "・情報共有で困った場面を聞く\n・後輩支援の具体例を伝える\n・支えてもらった場面を思い出す",
    interviewQuestions: "・チームで仕事を進める上でうまくいっていることは？\n・情報共有で困った経験は？\n・誰かに助けられたエピソードは？",
    weight: 2,
    sortOrder: 4,
    levels: [
      { score: 5, description: "周囲との協力を率先して進め、チーム全体のパフォーマンス向上に大きく貢献した" },
      { score: 4, description: "メンバーと積極的に連携し、チームに良い影響を与えていた" },
      { score: 3, description: "求められる範囲で協力を行い、業務上問題はなかった" },
      { score: 2, description: "協力が不足し、情報共有や役割分担に支障が出ることがあった" },
      { score: 1, description: "個人プレーが目立ち、チーム運営に悪影響を与えた" },
    ],
  },
  {
    id: "mock-item-improvement",
    name: "改善・自己研鑽",
    description: "業務の改善や自己学習に取り組み、成長を実感できたか",
    interviewPoint: "・期間中の学習・改善取り組みを振り返る\n・形になった例／止まった例の要因を分析\n・次期のテーマを擦り合わせ",
    interviewQuestions: "・新しく学んだこと・身に付いたスキルは？\n・もっと早く改善できたなと思うことは？\n・次期で挑戦したい学びは？",
    weight: 2,
    sortOrder: 5,
    levels: [
      { score: 5, description: "業務改善を継続的に提案・実施し、自己学習で得た知識を業務に活かしていた" },
      { score: 4, description: "改善提案や自己学習を主体的に行い、結果につなげていた" },
      { score: 3, description: "求められた範囲で学習・改善に取り組んだ" },
      { score: 2, description: "自発的な学習や改善は限定的だった" },
      { score: 1, description: "学習・改善への意欲が見られなかった" },
    ],
  },
  {
    id: "mock-item-result",
    name: "目標達成・成果",
    description: "半期の業務目標に対する達成度合い",
    interviewPoint: "・期初目標に対する達成度を定量・定性で確認\n・要因分析\n・次期目標の合意",
    interviewQuestions: "・期初目標に対する達成度の自己評価は？\n・達成／未達の最大要因は？\n・次期で挑戦したい数字・テーマは？",
    weight: 3,
    sortOrder: 6,
    levels: [
      { score: 5, description: "目標を大きく上回る成果を達成し、想定以上の貢献をした" },
      { score: 4, description: "目標を上回る成果を達成した" },
      { score: 3, description: "目標通りの成果を達成した" },
      { score: 2, description: "目標達成にやや届かなかった" },
      { score: 1, description: "目標達成に大きく届かなかった" },
    ],
  },
];

const GRADES = [
  { rank: 1, name: "1等級", role: "新人・トレーニー", description: "上司の指示のもと定型業務を確実に遂行。", salaryMin: 200000, salaryMax: 240000, isManager: false },
  { rank: 2, name: "2等級", role: "一般スタッフ", description: "標準的な業務を独力で遂行。担当顧客を持てる。", salaryMin: 230000, salaryMax: 280000, isManager: false },
  { rank: 3, name: "3等級", role: "中堅スタッフ", description: "業務を自律的に遂行し、後輩指導も行う。", salaryMin: 270000, salaryMax: 330000, isManager: false },
  { rank: 4, name: "4等級", role: "シニアスタッフ / リーダー", description: "高度な専門業務、部門内リーダー業務。", salaryMin: 320000, salaryMax: 400000, isManager: false },
  { rank: 5, name: "5等級", role: "マネージャー", description: "部署のマネジメント・部下育成・部門売上の責任。", salaryMin: 380000, salaryMax: 500000, isManager: true },
  { rank: 6, name: "6等級", role: "所長 / 部門統括", description: "事業所全体や複数部門の統括。最終評価者。", salaryMin: 480000, salaryMax: 700000, isManager: true },
];

const PULSE_QUESTIONS = [
  { id: "mock-pulse-q1", text: "今月の仕事は充実していましたか？", description: "1=全くそう思わない / 5=とてもそう思う", type: "SCORE_5" as const, sortOrder: 1, allowComment: false },
  { id: "mock-pulse-q2", text: "困った時に同僚や上司に相談しやすい雰囲気でしたか？", type: "SCORE_5" as const, sortOrder: 2, allowComment: false },
  { id: "mock-pulse-q3", text: "業務量はちょうど良かったですか？", description: "1=多すぎ / 3=ちょうど良い / 5=もっとできる", type: "SCORE_5" as const, sortOrder: 3, allowComment: true },
  { id: "mock-pulse-q4", text: "新しいスキルや知識が身についた実感はありますか？", type: "SCORE_5" as const, sortOrder: 4, allowComment: false },
  { id: "mock-pulse-q5", text: "今後もこの会社で働き続けたいと思いますか？", type: "SCORE_5" as const, sortOrder: 5, allowComment: false },
  { id: "mock-pulse-q6", text: "今月いちばん良かったこと・嬉しかったことを教えてください（任意）", type: "TEXT" as const, sortOrder: 6, allowComment: false },
];

// 5 名分の従業員データ
const EMPLOYEES = [
  {
    code: "E001",
    lastName: "鈴木",
    firstName: "一郎",
    lastNameKana: "スズキ",
    firstNameKana: "イチロウ",
    hireDate: "2018-04-01",
    departmentName: "管理部",
    positionName: "所長",
    gradeRank: 6,
    isDirector: true,
    isManager: false,
    loginEmail: "demo.suzuki@hreva-mock.example",
  },
  {
    code: "E002",
    lastName: "佐藤",
    firstName: "美咲",
    lastNameKana: "サトウ",
    firstNameKana: "ミサキ",
    hireDate: "2020-04-01",
    departmentName: "営業部",
    positionName: "課長",
    gradeRank: 5,
    isDirector: false,
    isManager: true,
    loginEmail: "demo.sato@hreva-mock.example",
  },
  {
    code: "E003",
    lastName: "田中",
    firstName: "健太",
    lastNameKana: "タナカ",
    firstNameKana: "ケンタ",
    hireDate: "2022-04-01",
    departmentName: "営業部",
    positionName: "主任",
    gradeRank: 3,
    isDirector: false,
    isManager: false,
    loginEmail: "demo.tanaka@hreva-mock.example",
  },
  {
    code: "E004",
    lastName: "山田",
    firstName: "花子",
    lastNameKana: "ヤマダ",
    firstNameKana: "ハナコ",
    hireDate: "2023-04-01",
    departmentName: "営業部",
    positionName: "一般社員",
    gradeRank: 2,
    isDirector: false,
    isManager: false,
    loginEmail: "demo.yamada@hreva-mock.example",
  },
  {
    code: "E005",
    lastName: "高橋",
    firstName: "翔",
    lastNameKana: "タカハシ",
    firstNameKana: "ショウ",
    hireDate: "2024-04-01",
    departmentName: "営業部",
    positionName: "一般社員",
    gradeRank: 1,
    isDirector: false,
    isManager: false,
    loginEmail: "demo.takahashi@hreva-mock.example",
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // テナント（社労士事務所）
  const tenant = await prisma.tenant.upsert({
    where: { id: "mock-tenant" },
    update: { name: "サンプル社労士事務所" },
    create: { id: "mock-tenant", name: "サンプル社労士事務所" },
  });

  // 社労士ユーザー
  const srUser = await prisma.user.upsert({
    where: { email: "demo.sr@hreva-mock.example" },
    update: { tenantId: tenant.id, role: "SR_ADMIN", passwordHash },
    create: {
      email: "demo.sr@hreva-mock.example",
      name: "山口 社労士",
      passwordHash,
      role: "SR_ADMIN",
      tenantId: tenant.id,
    },
  });

  // クライアント企業
  const client = await prisma.client.upsert({
    where: { id: "mock-client" },
    update: { tenantId: tenant.id, name: "ABC商事株式会社" },
    create: { id: "mock-client", tenantId: tenant.id, name: "ABC商事株式会社" },
  });

  // クライアント管理者
  await prisma.user.upsert({
    where: { email: "demo.admin@hreva-mock.example" },
    update: { tenantId: tenant.id, clientId: client.id, role: "CLIENT_ADMIN", passwordHash },
    create: {
      email: "demo.admin@hreva-mock.example",
      name: "渡辺 管理者",
      passwordHash,
      role: "CLIENT_ADMIN",
      tenantId: tenant.id,
      clientId: client.id,
    },
  });

  // 部署
  const deptByName: Record<string, string> = {};
  for (const name of ["管理部", "営業部"]) {
    const d = await prisma.department.upsert({
      where: { id: `mock-dept-${name}` },
      update: { name },
      create: { id: `mock-dept-${name}`, clientId: client.id, name },
    });
    deptByName[name] = d.id;
  }

  // 役職
  const posByName: Record<string, string> = {};
  const positions = [
    { name: "所長", rank: 5 },
    { name: "課長", rank: 4 },
    { name: "主任", rank: 2 },
    { name: "一般社員", rank: 1 },
  ];
  for (const p of positions) {
    const pos = await prisma.position.upsert({
      where: { id: `mock-pos-${p.name}` },
      update: { name: p.name, rank: p.rank },
      create: { id: `mock-pos-${p.name}`, clientId: client.id, name: p.name, rank: p.rank },
    });
    posByName[p.name] = pos.id;
  }

  // 等級
  const gradeByRank = new Map<number, string>();
  for (const g of GRADES) {
    const grade = await prisma.grade.upsert({
      where: { clientId_rank: { clientId: client.id, rank: g.rank } },
      update: { name: g.name, role: g.role, description: g.description, salaryMin: g.salaryMin, salaryMax: g.salaryMax, isManager: g.isManager },
      create: { clientId: client.id, ...g },
    });
    gradeByRank.set(g.rank, grade.id);
  }

  // 評価制度テンプレート
  const template = await prisma.evaluationTemplate.upsert({
    where: { id: "mock-template" },
    update: {
      tenantId: tenant.id,
      name: "行動指針（半期評価）",
      description: "Nice-one 評価モデルをベースとした半期ごとの行動・成果評価。絶対評価で実施。",
    },
    create: {
      id: "mock-template",
      tenantId: tenant.id,
      name: "行動指針（半期評価）",
      description: "Nice-one 評価モデルをベースとした半期ごとの行動・成果評価。絶対評価で実施。",
    },
  });

  // 評価項目 + 各点定義
  for (const item of TEMPLATE_ITEMS) {
    const created = await prisma.evaluationTemplateItem.upsert({
      where: { id: item.id },
      update: {
        templateId: template.id,
        name: item.name,
        description: item.description,
        interviewPoint: item.interviewPoint,
        interviewQuestions: item.interviewQuestions,
        weight: item.weight,
        sortOrder: item.sortOrder,
        maxScore: 5,
      },
      create: {
        id: item.id,
        templateId: template.id,
        name: item.name,
        description: item.description,
        interviewPoint: item.interviewPoint,
        interviewQuestions: item.interviewQuestions,
        weight: item.weight,
        sortOrder: item.sortOrder,
        maxScore: 5,
      },
    });
    for (const lv of item.levels) {
      await prisma.evaluationItemLevel.upsert({
        where: { itemId_score: { itemId: created.id, score: lv.score } },
        update: { description: lv.description },
        create: { itemId: created.id, score: lv.score, description: lv.description },
      });
    }
  }

  // 評価期間（運用中）
  const currentYear = new Date().getFullYear();
  const period = await prisma.evaluationPeriod.upsert({
    where: { id: "mock-period" },
    update: {
      clientId: client.id,
      templateId: template.id,
      name: `${currentYear}年度 上期評価`,
      half: "UPPER",
      startDate: new Date(`${currentYear}-04-01`),
      endDate: new Date(`${currentYear}-09-30`),
      selfEvalDueDate: new Date(`${currentYear}-10-10`),
      primaryEvalDueDate: new Date(`${currentYear}-10-20`),
      finalEvalDueDate: new Date(`${currentYear}-11-05`),
      feedbackPeriodMonth: 11,
      status: "OPEN",
    },
    create: {
      id: "mock-period",
      clientId: client.id,
      templateId: template.id,
      name: `${currentYear}年度 上期評価`,
      half: "UPPER",
      startDate: new Date(`${currentYear}-04-01`),
      endDate: new Date(`${currentYear}-09-30`),
      selfEvalDueDate: new Date(`${currentYear}-10-10`),
      primaryEvalDueDate: new Date(`${currentYear}-10-20`),
      finalEvalDueDate: new Date(`${currentYear}-11-05`),
      feedbackPeriodMonth: 11,
      status: "OPEN",
    },
  });

  // 従業員 (Pass 1: 個人作成)
  const empIdByCode = new Map<string, string>();
  for (const e of EMPLOYEES) {
    const employee = await prisma.employee.upsert({
      where: { clientId_employeeCode: { clientId: client.id, employeeCode: e.code } },
      update: {
        lastName: e.lastName,
        firstName: e.firstName,
        lastNameKana: e.lastNameKana,
        firstNameKana: e.firstNameKana,
        hireDate: new Date(e.hireDate),
        departmentId: deptByName[e.departmentName],
        positionId: posByName[e.positionName],
        gradeId: gradeByRank.get(e.gradeRank),
      },
      create: {
        clientId: client.id,
        employeeCode: e.code,
        lastName: e.lastName,
        firstName: e.firstName,
        lastNameKana: e.lastNameKana,
        firstNameKana: e.firstNameKana,
        hireDate: new Date(e.hireDate),
        departmentId: deptByName[e.departmentName],
        positionId: posByName[e.positionName],
        gradeId: gradeByRank.get(e.gradeRank),
      },
    });
    empIdByCode.set(e.code, employee.id);

    // ログインアカウント
    await prisma.user.upsert({
      where: { email: e.loginEmail },
      update: {
        name: `${e.lastName} ${e.firstName}`,
        passwordHash,
        role: "EMPLOYEE",
        tenantId: tenant.id,
        clientId: client.id,
        employeeId: employee.id,
      },
      create: {
        email: e.loginEmail,
        name: `${e.lastName} ${e.firstName}`,
        passwordHash,
        role: "EMPLOYEE",
        tenantId: tenant.id,
        clientId: client.id,
        employeeId: employee.id,
      },
    });
  }

  // Pass 2: 評価者リンク
  // 鈴木所長 (E001) は finalEvaluator
  // 佐藤課長 (E002) は manager
  // 他の従業員は 佐藤を一次評価者、鈴木を最終評価者にする
  const directorId = empIdByCode.get("E001");
  const managerId = empIdByCode.get("E002");
  // 佐藤課長は鈴木所長を一次・最終ともに鈴木にする
  await prisma.employee.update({
    where: { id: managerId! },
    data: { managerEmployeeId: directorId, finalEvaluatorEmployeeId: directorId },
  });
  for (const code of ["E003", "E004", "E005"]) {
    await prisma.employee.update({
      where: { id: empIdByCode.get(code)! },
      data: { managerEmployeeId: managerId, finalEvaluatorEmployeeId: directorId },
    });
  }

  // 評価インスタンス + 3階層アサインメント（E002-E005, 4名）
  // E001 (所長本人) は被評価対象外とする
  for (const code of ["E002", "E003", "E004", "E005"]) {
    const empId = empIdByCode.get(code)!;
    const emp = await prisma.employee.findUnique({ where: { id: empId } });
    const evaluation = await prisma.evaluation.upsert({
      where: { periodId_employeeId: { periodId: period.id, employeeId: empId } },
      update: {},
      create: { periodId: period.id, employeeId: empId },
    });
    // SELF
    await prisma.evaluationAssignment.upsert({
      where: { evaluationId_evaluatorEmployeeId_role: { evaluationId: evaluation.id, evaluatorEmployeeId: empId, role: "SELF" } },
      update: {},
      create: { evaluationId: evaluation.id, evaluatorEmployeeId: empId, role: "SELF" },
    });
    // MANAGER
    if (emp?.managerEmployeeId) {
      await prisma.evaluationAssignment.upsert({
        where: { evaluationId_evaluatorEmployeeId_role: { evaluationId: evaluation.id, evaluatorEmployeeId: emp.managerEmployeeId, role: "MANAGER" } },
        update: {},
        create: { evaluationId: evaluation.id, evaluatorEmployeeId: emp.managerEmployeeId, role: "MANAGER" },
      });
    }
    // FINAL
    if (emp?.finalEvaluatorEmployeeId) {
      await prisma.evaluationAssignment.upsert({
        where: { evaluationId_evaluatorEmployeeId_role: { evaluationId: evaluation.id, evaluatorEmployeeId: emp.finalEvaluatorEmployeeId, role: "FINAL" } },
        update: {},
        create: { evaluationId: evaluation.id, evaluatorEmployeeId: emp.finalEvaluatorEmployeeId, role: "FINAL" },
      });
    }
  }

  // パルスサーベイ 設問
  for (const q of PULSE_QUESTIONS) {
    await prisma.pulseQuestion.upsert({
      where: { id: q.id },
      update: {
        clientId: client.id,
        text: q.text,
        description: q.description ?? null,
        type: q.type,
        sortOrder: q.sortOrder,
        allowComment: q.allowComment,
      },
      create: {
        id: q.id,
        clientId: client.id,
        text: q.text,
        description: q.description ?? null,
        type: q.type,
        sortOrder: q.sortOrder,
        allowComment: q.allowComment,
      },
    });
  }

  // 直近3か月のパルスサーベイ + 回答（モックアップ用）
  const now = new Date();
  const surveyMonths: { ym: string; surveyId: string }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const survey = await prisma.pulseSurvey.upsert({
      where: { clientId_yearMonth: { clientId: client.id, yearMonth: ym } },
      update: { status: i === 0 ? "OPEN" : "CLOSED" },
      create: {
        clientId: client.id,
        yearMonth: ym,
        dueDate: new Date(d.getFullYear(), d.getMonth() + 1, 0),
        status: i === 0 ? "OPEN" : "CLOSED",
      },
    });
    surveyMonths.push({ ym, surveyId: survey.id });
  }

  // 各従業員の回答（モック値）
  const mockScores: Record<string, number[]> = {
    // 月i (0..2) を index にしたスコアの並び (q1〜q5 用)
    E001: [5, 5, 5, 5, 5],
    E002: [4, 4, 3, 4, 5],
    E003: [4, 5, 4, 4, 5],
    E004: [3, 4, 2, 3, 4],
    E005: [4, 4, 3, 5, 4],
  };
  const mockTexts: Record<string, string[]> = {
    E001: [
      "メンバー全員が高い意欲で取り組めている",
      "顧客から感謝の声を多くいただけた",
      "次期に向けて目標設定を全員と完了できた",
    ],
    E002: [
      "新規開拓案件で成果が出始めた",
      "チーム内で情報共有がスムーズになった",
      "後輩の指導で成長を感じられた",
    ],
    E003: [
      "担当顧客とのコミュニケーションが深まった",
      "資料作成のスピードが上がった",
      "勉強会で学んだ知識を実務に活かせた",
    ],
    E004: [
      "上司から具体的なアドバイスをもらえた",
      "業務量が少し多めだったが何とか乗り切れた",
      "新しい業務にチャレンジできた",
    ],
    E005: [
      "先輩のサポートがありがたかった",
      "毎日の業務に少しずつ慣れてきた",
      "資格取得の勉強を継続できている",
    ],
  };

  for (let mi = 0; mi < surveyMonths.length; mi++) {
    const { surveyId } = surveyMonths[mi];
    for (const code of ["E001", "E002", "E003", "E004", "E005"]) {
      const empId = empIdByCode.get(code)!;
      const scores = mockScores[code];
      // 月によって微妙にバラす
      const adjustedScores = scores.map((s, i) => Math.max(1, Math.min(5, s + (mi === 0 ? 0 : mi === 1 ? -1 : 0) + (i === 2 ? 0 : 0))));
      const avg = adjustedScores.reduce((a, b) => a + b, 0) / adjustedScores.length;

      const response = await prisma.pulseResponse.upsert({
        where: { surveyId_employeeId: { surveyId, employeeId: empId } },
        update: { submittedAt: new Date(), averageScore: avg },
        create: { surveyId, employeeId: empId, submittedAt: new Date(), averageScore: avg },
      });

      // 設問1〜5 の SCORE_5 回答
      const scoreQids = ["mock-pulse-q1", "mock-pulse-q2", "mock-pulse-q3", "mock-pulse-q4", "mock-pulse-q5"];
      for (let qi = 0; qi < scoreQids.length; qi++) {
        await prisma.pulseAnswer.upsert({
          where: { responseId_questionId: { responseId: response.id, questionId: scoreQids[qi] } },
          update: { score: adjustedScores[qi] },
          create: { responseId: response.id, questionId: scoreQids[qi], score: adjustedScores[qi] },
        });
      }
      // 設問6（自由記述）
      const text = mockTexts[code][mi] ?? null;
      if (text) {
        await prisma.pulseAnswer.upsert({
          where: { responseId_questionId: { responseId: response.id, questionId: "mock-pulse-q6" } },
          update: { text },
          create: { responseId: response.id, questionId: "mock-pulse-q6", text },
        });
      }
    }
  }

  // 直近3か月の賃金記録
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    for (const e of EMPLOYEES) {
      const empId = empIdByCode.get(e.code)!;
      const grade = GRADES.find((g) => g.rank === e.gradeRank)!;
      const base = Math.round((grade.salaryMin + grade.salaryMax) / 2 / 10000) * 10000;
      const overtime = Math.floor(Math.random() * 30000);
      const other = 15000;
      const deduction = Math.floor((base + overtime + other) * 0.15);
      const net = base + overtime + other - deduction;
      await prisma.wageRecord.upsert({
        where: { employeeId_yearMonth: { employeeId: empId, yearMonth: ym } },
        update: {
          basicSalary: base,
          overtimeAllowance: overtime,
          otherAllowance: other,
          deduction,
          netPay: net,
        },
        create: {
          employeeId: empId,
          yearMonth: ym,
          basicSalary: base,
          overtimeAllowance: overtime,
          otherAllowance: other,
          deduction,
          netPay: net,
        },
      });
    }
  }

  // 有給残高
  for (const e of EMPLOYEES) {
    const empId = empIdByCode.get(e.code)!;
    const granted = 20;
    const used = Math.floor(Math.random() * 10);
    await prisma.leaveBalance.upsert({
      where: { employeeId_year: { employeeId: empId, year: now.getFullYear() } },
      update: { granted, used, remaining: granted - used },
      create: { employeeId: empId, year: now.getFullYear(), granted, used, remaining: granted - used },
    });
  }

  console.log("\n=================================================");
  console.log("✓ モックアップデモデータ投入完了");
  console.log("=================================================");
  console.log("\nログインアカウント（全て同じパスワード）:");
  console.log(`パスワード: ${PASSWORD}`);
  console.log("\n[社労士]");
  console.log("  山口 社労士     : demo.sr@hreva-mock.example");
  console.log("\n[クライアント管理者（ABC商事 所長相当）]");
  console.log("  渡辺 管理者     : demo.admin@hreva-mock.example");
  console.log("\n[従業員（5名）]");
  for (const e of EMPLOYEES) {
    const role = e.isDirector ? "最終評価者（所長）" : e.isManager ? "一次評価者（課長）" : "一般社員";
    console.log(`  ${e.lastName} ${e.firstName.padEnd(4, "　")}   : ${e.loginEmail}    [${role}]`);
  }
  console.log("\n[組織情報]");
  console.log("  テナント       : サンプル社労士事務所");
  console.log("  クライアント企業: ABC商事株式会社");
  console.log("  評価期間       : 上期評価（OPEN中）");
  console.log("  パルスサーベイ : 直近3か月分の回答済データ");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
