import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// 汎用版・業種非依存の行動指針評価項目（5段階絶対評価）
// 会社ごとに編集可能なデフォルトコンテンツ
const DEFAULT_TEMPLATE_ITEMS: Array<{
  id: string;
  name: string;
  description: string;
  interviewPoint: string;
  interviewQuestions: string;
  weight: number;
  sortOrder: number;
  levels: { score: number; description: string }[];
}> = [
  {
    id: "demo-item-rule",
    name: "規律性",
    description: "上司の指示・命令や諸規則を守り、職場の秩序向上に努めていたか",
    interviewPoint:
      "・指示や規則を守れている具体的な場面を本人と共有する\n・守りにくいと感じた場面（負荷・人間関係・物理的な要因）を聞き取る\n・他のメンバーの模範となれている部分があれば具体的に伝える",
    interviewQuestions:
      "・自分が職場のルールを守れていると感じた場面はありますか？\n・逆に、ルールが守りづらいと感じた場面はありましたか？その背景は？\n・他のメンバーの行動で「これは見習いたい」と思ったことは？",
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
    id: "demo-item-quality",
    name: "正確性・品質",
    description: "業務を正確かつ高品質に遂行できたか（責任感、ミスの少なさ、品質追求）",
    interviewPoint:
      "・期間中に発生したミス・ヒヤリハットの種類と原因を一緒に振り返る\n・ダブルチェック等、ミスを防いでいる工夫があれば具体的に共有\n・品質を高めるために本人が今後挑戦したいことを聞く",
    interviewQuestions:
      "・この半期で、自分の仕事の品質に満足できた場面はありますか？\n・ミスやヒヤリハットがあった時、原因は何だったと思いますか？\n・仕事の品質を上げるために、新しく取り入れたい工夫はありますか？",
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
    id: "demo-item-customer",
    name: "対応力（顧客・社内）",
    description: "お客様や社内関係者からの依頼・問合せに迅速かつ的確に対応できたか",
    interviewPoint:
      "・特に喜ばれた／指摘を受けたエピソードを共有する\n・対応プロセスでうまく回せている工夫を言語化する\n・次の半期で改善・強化したいテーマを擦り合わせる",
    interviewQuestions:
      "・この半期で印象に残った対応はありますか？\n・相手から学んだこと、改善のヒントを得たことは？\n・次の半期で「ここを伸ばしたい」というテーマがあれば教えてください。",
    weight: 3,
    sortOrder: 3,
    levels: [
      { score: 5, description: "相手のニーズを的確に汲み取り、期待を上回る対応を継続し、深い信頼関係を築いた" },
      { score: 4, description: "丁寧で迅速な対応により評価を得る場面が多く、信頼関係を築けていた" },
      { score: 3, description: "求められる対応を行い、特段の問題は発生しなかった" },
      { score: 2, description: "対応が受身的で、指摘を受ける場面があった" },
      { score: 1, description: "対応に問題があり、強い指摘やクレームを受けた" },
    ],
  },
  {
    id: "demo-item-cooperation",
    name: "協調性・チームワーク",
    description: "社内での協力体制づくりに貢献したか（情報共有、後輩支援等）",
    interviewPoint:
      "・チーム内での情報共有・引継ぎについて困っている場面を聞く\n・後輩や他メンバーへ良い影響を与えた具体例があれば伝える\n・自分が誰かに支えてもらった場面・感謝を伝える",
    interviewQuestions:
      "・チームで仕事を進める上で、うまくいっていることは何ですか？\n・情報共有や引継ぎで困った経験は？\n・他メンバーに支えてもらって助かったエピソードがあれば教えてください。",
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
    id: "demo-item-improvement",
    name: "改善・自己研鑽",
    description: "業務の改善や自己学習に取り組み、成長を実感できたか",
    interviewPoint:
      "・期間中に取り組んだ業務改善・学習内容を一緒に振り返る\n・改善提案が形になった事例／止まってしまった事例の要因を分析する\n・次の半期に挑戦したい資格・スキル・改善テーマを擦り合わせる",
    interviewQuestions:
      "・この半期で新しく学んだこと・身に付いたスキルは何ですか？\n・「もっと早く改善できたな」と思っていることは？\n・次の半期で挑戦したい学び・改善テーマは？",
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
    id: "demo-item-result",
    name: "目標達成・成果",
    description: "半期の業務目標に対する達成度合い",
    interviewPoint:
      "・期初に立てた目標に対して、結果がどうだったかを定量・定性で確認する\n・達成／未達の要因を本人視点と上司視点で擦り合わせる\n・次期の目標水準と、達成に向けた具体アクションを合意する",
    interviewQuestions:
      "・期初の目標に対して、自分では達成度をどう評価していますか？\n・達成／未達の最大の要因は何だと思いますか？\n・次期の目標として、自分が挑戦したい数字・テーマは？",
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

// デフォルト等級基準表（1〜6等級、汎用版）
const DEFAULT_GRADES: Array<{
  rank: number;
  name: string;
  role: string;
  description: string;
  salaryMin: number;
  salaryMax: number;
  isManager: boolean;
}> = [
  {
    rank: 1,
    name: "1等級",
    role: "新人・トレーニー",
    description: "上司の指示のもと、定型業務を確実に遂行できる。基本的な業務知識を身に付ける段階。",
    salaryMin: 200000,
    salaryMax: 240000,
    isManager: false,
  },
  {
    rank: 2,
    name: "2等級",
    role: "一般スタッフ",
    description: "標準的な業務を独力で遂行できる。担当領域や担当顧客の対応を行える。",
    salaryMin: 230000,
    salaryMax: 280000,
    isManager: false,
  },
  {
    rank: 3,
    name: "3等級",
    role: "中堅スタッフ",
    description: "業務を自律的に遂行し、後輩指導も行う。インセンティブ対象。一通りのスキルを保有。",
    salaryMin: 270000,
    salaryMax: 330000,
    isManager: false,
  },
  {
    rank: 4,
    name: "4等級",
    role: "シニアスタッフ / リーダー",
    description: "高度な専門業務、部門内のリーダー業務、複数顧問先の取りまとめが可能。",
    salaryMin: 320000,
    salaryMax: 400000,
    isManager: false,
  },
  {
    rank: 5,
    name: "5等級",
    role: "マネージャー",
    description: "部署のマネジメントを担い、部下の育成、部門売上の責任を持つ。",
    salaryMin: 380000,
    salaryMax: 500000,
    isManager: true,
  },
  {
    rank: 6,
    name: "6等級",
    role: "所長 / 部門統括",
    description: "事業所全体や複数部門を統括し、最終評価者として組織全体の方針を担う。",
    salaryMin: 480000,
    salaryMax: 700000,
    isManager: true,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "スーパー管理者",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant" },
    update: {},
    create: { id: "demo-tenant", name: "デモ社労士事務所" },
  });

  await prisma.user.upsert({
    where: { email: "sr@example.com" },
    update: {},
    create: {
      email: "sr@example.com",
      name: "社労士太郎",
      passwordHash,
      role: "SR_ADMIN",
      tenantId: tenant.id,
    },
  });

  const client = await prisma.client.upsert({
    where: { id: "demo-client" },
    update: {},
    create: { id: "demo-client", tenantId: tenant.id, name: "デモ株式会社" },
  });

  await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      email: "client@example.com",
      name: "クライアント管理者",
      passwordHash,
      role: "CLIENT_ADMIN",
      tenantId: tenant.id,
      clientId: client.id,
    },
  });

  const dept = await prisma.department.upsert({
    where: { id: "demo-dept" },
    update: {},
    create: { id: "demo-dept", clientId: client.id, name: "労務コンサル部" },
  });
  const pos = await prisma.position.upsert({
    where: { id: "demo-pos" },
    update: {},
    create: { id: "demo-pos", clientId: client.id, name: "一般社員", rank: 1 },
  });

  // 等級基準表（デフォルトコンテンツ、会社ごとに編集可能）
  const gradesByRank = new Map<number, string>();
  for (const g of DEFAULT_GRADES) {
    const grade = await prisma.grade.upsert({
      where: { clientId_rank: { clientId: client.id, rank: g.rank } },
      update: {},
      create: {
        clientId: client.id,
        rank: g.rank,
        name: g.name,
        role: g.role,
        description: g.description,
        salaryMin: g.salaryMin,
        salaryMax: g.salaryMax,
        isManager: g.isManager,
      },
    });
    gradesByRank.set(g.rank, grade.id);
  }

  // 所長（最終評価者）
  const director = await prisma.employee.upsert({
    where: { clientId_employeeCode: { clientId: client.id, employeeCode: "D001" } },
    update: {
      gradeId: gradesByRank.get(6),
      departmentId: dept.id,
      positionId: pos.id,
    },
    create: {
      clientId: client.id,
      employeeCode: "D001",
      lastName: "鈴木",
      firstName: "所長",
      hireDate: new Date("2015-04-01"),
      departmentId: dept.id,
      positionId: pos.id,
      gradeId: gradesByRank.get(6),
    },
  });

  // 一次評価者（マネージャー）
  const manager = await prisma.employee.upsert({
    where: { clientId_employeeCode: { clientId: client.id, employeeCode: "M001" } },
    update: {
      gradeId: gradesByRank.get(5),
      finalEvaluatorEmployeeId: director.id,
    },
    create: {
      clientId: client.id,
      employeeCode: "M001",
      lastName: "山田",
      firstName: "課長",
      hireDate: new Date("2020-04-01"),
      departmentId: dept.id,
      positionId: pos.id,
      gradeId: gradesByRank.get(5),
      finalEvaluatorEmployeeId: director.id,
    },
  });

  // 従業員（一般）
  const employee = await prisma.employee.upsert({
    where: { clientId_employeeCode: { clientId: client.id, employeeCode: "E001" } },
    update: {
      departmentId: dept.id,
      gradeId: gradesByRank.get(2),
      managerEmployeeId: manager.id,
      finalEvaluatorEmployeeId: director.id,
    },
    create: {
      clientId: client.id,
      employeeCode: "E001",
      lastName: "佐藤",
      firstName: "従業員",
      hireDate: new Date("2024-04-01"),
      departmentId: dept.id,
      positionId: pos.id,
      gradeId: gradesByRank.get(2),
      managerEmployeeId: manager.id,
      finalEvaluatorEmployeeId: director.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "employee@example.com" },
    update: {},
    create: {
      email: "employee@example.com",
      name: "佐藤 従業員",
      passwordHash,
      role: "EMPLOYEE",
      tenantId: tenant.id,
      clientId: client.id,
      employeeId: employee.id,
    },
  });

  // 一次評価者（直属上司）のログインアカウント
  await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: { employeeId: manager.id },
    create: {
      email: "manager@example.com",
      name: "山田 課長",
      passwordHash,
      role: "EMPLOYEE",
      tenantId: tenant.id,
      clientId: client.id,
      employeeId: manager.id,
    },
  });

  // 最終評価者（所長）のログインアカウント
  await prisma.user.upsert({
    where: { email: "director@example.com" },
    update: { employeeId: director.id },
    create: {
      email: "director@example.com",
      name: "鈴木 所長",
      passwordHash,
      role: "EMPLOYEE",
      tenantId: tenant.id,
      clientId: client.id,
      employeeId: director.id,
    },
  });

  // 評価制度テンプレ：行動指針（汎用版）
  const template = await prisma.evaluationTemplate.upsert({
    where: { id: "demo-template" },
    update: {
      name: "行動指針（半期評価）",
      description: "半期ごとの行動・成果を絶対評価で測定する標準テンプレート。各項目は5段階評価＋面談用の質問例つき。",
    },
    create: {
      id: "demo-template",
      tenantId: tenant.id,
      name: "行動指針（半期評価）",
      description: "半期ごとの行動・成果を絶対評価で測定する標準テンプレート。各項目は5段階評価＋面談用の質問例つき。",
    },
  });

  // 既存のサンプル項目を一旦すべて削除し、新しい行動指針で置き換える
  await prisma.evaluationTemplateItem.deleteMany({
    where: {
      templateId: template.id,
      NOT: { id: { in: DEFAULT_TEMPLATE_ITEMS.map((i) => i.id) } },
    },
  });

  for (const item of DEFAULT_TEMPLATE_ITEMS) {
    const created = await prisma.evaluationTemplateItem.upsert({
      where: { id: item.id },
      update: {
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

  // デフォルト評価期間（下期 5月〜10月、12月にフィードバック面談）
  const currentYear = new Date().getFullYear();
  const period = await prisma.evaluationPeriod.upsert({
    where: { id: "demo-period" },
    update: {
      name: `${currentYear}年度 下期評価`,
      templateId: template.id,
      half: "LOWER",
      startDate: new Date(`${currentYear}-05-01`),
      endDate: new Date(`${currentYear}-10-31`),
      selfEvalDueDate: new Date(`${currentYear}-10-20`),
      primaryEvalDueDate: new Date(`${currentYear}-10-31`),
      finalEvalDueDate: new Date(`${currentYear}-11-15`),
      feedbackPeriodMonth: 12,
      status: "OPEN",
    },
    create: {
      id: "demo-period",
      clientId: client.id,
      templateId: template.id,
      name: `${currentYear}年度 下期評価`,
      half: "LOWER",
      startDate: new Date(`${currentYear}-05-01`),
      endDate: new Date(`${currentYear}-10-31`),
      selfEvalDueDate: new Date(`${currentYear}-10-20`),
      primaryEvalDueDate: new Date(`${currentYear}-10-31`),
      finalEvalDueDate: new Date(`${currentYear}-11-15`),
      feedbackPeriodMonth: 12,
      status: "OPEN",
    },
  });

  // 佐藤 従業員 への評価インスタンス（自己/一次/最終の3アサイン）
  const evaluation = await prisma.evaluation.upsert({
    where: { periodId_employeeId: { periodId: period.id, employeeId: employee.id } },
    update: {},
    create: { periodId: period.id, employeeId: employee.id },
  });

  await prisma.evaluationAssignment.upsert({
    where: {
      evaluationId_evaluatorEmployeeId_role: {
        evaluationId: evaluation.id,
        evaluatorEmployeeId: employee.id,
        role: "SELF",
      },
    },
    update: {},
    create: { evaluationId: evaluation.id, evaluatorEmployeeId: employee.id, role: "SELF" },
  });
  await prisma.evaluationAssignment.upsert({
    where: {
      evaluationId_evaluatorEmployeeId_role: {
        evaluationId: evaluation.id,
        evaluatorEmployeeId: manager.id,
        role: "MANAGER",
      },
    },
    update: {},
    create: { evaluationId: evaluation.id, evaluatorEmployeeId: manager.id, role: "MANAGER" },
  });
  await prisma.evaluationAssignment.upsert({
    where: {
      evaluationId_evaluatorEmployeeId_role: {
        evaluationId: evaluation.id,
        evaluatorEmployeeId: director.id,
        role: "FINAL",
      },
    },
    update: {},
    create: { evaluationId: evaluation.id, evaluatorEmployeeId: director.id, role: "FINAL" },
  });

  // パルスサーベイ デフォルト設問（5問）— 会社ごとに編集可能
  const DEFAULT_PULSE_QUESTIONS: Array<{
    id: string;
    text: string;
    description?: string;
    type: "SCORE_5" | "TEXT" | "YES_NO";
    sortOrder: number;
    allowComment: boolean;
  }> = [
    {
      id: "demo-pulse-q1",
      text: "今月の仕事は充実していましたか？",
      description: "1=全くそう思わない / 5=とてもそう思う",
      type: "SCORE_5",
      sortOrder: 1,
      allowComment: false,
    },
    {
      id: "demo-pulse-q2",
      text: "困った時に同僚や上司に相談しやすい雰囲気でしたか？",
      type: "SCORE_5",
      sortOrder: 2,
      allowComment: false,
    },
    {
      id: "demo-pulse-q3",
      text: "業務量はちょうど良かったですか？",
      description: "1=多すぎ／3=ちょうど良い／5=もっとできる",
      type: "SCORE_5",
      sortOrder: 3,
      allowComment: true,
    },
    {
      id: "demo-pulse-q4",
      text: "新しいスキルや知識が身についた実感はありますか？",
      type: "SCORE_5",
      sortOrder: 4,
      allowComment: false,
    },
    {
      id: "demo-pulse-q5",
      text: "今後もこの会社で働き続けたいと思いますか？",
      type: "SCORE_5",
      sortOrder: 5,
      allowComment: false,
    },
    {
      id: "demo-pulse-q6",
      text: "今月いちばん良かったこと・嬉しかったことを教えてください（任意）",
      type: "TEXT",
      sortOrder: 6,
      allowComment: false,
    },
    {
      id: "demo-pulse-q7",
      text: "気になっていること・改善してほしいことを教えてください（任意）",
      type: "TEXT",
      sortOrder: 7,
      allowComment: false,
    },
  ];
  for (const q of DEFAULT_PULSE_QUESTIONS) {
    await prisma.pulseQuestion.upsert({
      where: { id: q.id },
      update: {
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

  // 当月のサーベイインスタンス（OPEN）
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await prisma.pulseSurvey.upsert({
    where: { clientId_yearMonth: { clientId: client.id, yearMonth: currentYM } },
    update: {},
    create: {
      clientId: client.id,
      yearMonth: currentYM,
      status: "OPEN",
      dueDate: new Date(now.getFullYear(), now.getMonth() + 1, 0), // 月末
    },
  });

  console.log("Seed completed.");
  console.log("Login credentials (password: password123):");
  console.log("  Super Admin       : admin@example.com");
  console.log("  社労士            : sr@example.com");
  console.log("  クライアント管理者 : client@example.com");
  console.log("  従業員（被評価者）: employee@example.com");
  console.log("  一次評価者（上司）: manager@example.com");
  console.log("  最終評価者（所長）: director@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
