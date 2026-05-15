import { NextResponse } from "next/server";
import { stringifyCsv } from "@/lib/csv";

/**
 * 評価制度テンプレートを CSV で新規作成する際の雛形をダウンロード。
 * 認証不要（公開ファイル）。
 */
export async function GET() {
  const headers = [
    "sortOrder",
    "name",
    "description",
    "weight",
    "maxScore",
    "interviewPoint",
    "interviewQuestions",
    "level5",
    "level4",
    "level3",
    "level2",
    "level1",
  ];
  const rows = [
    {
      sortOrder: "1",
      name: "規律性",
      description: "上司の指示・命令や諸規則を守り、職場の秩序向上に努めていたか",
      weight: "2",
      maxScore: "5",
      interviewPoint:
        "・指示や規則を守れている具体的な場面を本人と共有する\n・守りにくいと感じた場面を聞き取る",
      interviewQuestions:
        "・自分が職場のルールを守れていると感じた場面はありますか？\n・逆に、ルールが守りづらいと感じた場面はありましたか？",
      level5: "諸規則や上司の指示を自ら進んで守り、他の者の良い模範となっていた",
      level4: "諸規則や上司の指示は定められたとおり守っており、他の者にも良い影響があった",
      level3: "諸規則や上司の指示に違反することはほとんどなく、職場の秩序を乱すことはなかった",
      level2: "諸規則や指示にやや無関心なところがあり、時々守られていないことがあった",
      level1: "諸規則や指示に反する行為が見られ、注意しても繰り返すことがあった",
    },
    {
      sortOrder: "2",
      name: "業務遂行力",
      description: "業務を正確かつ高品質に遂行できたか",
      weight: "3",
      maxScore: "5",
      interviewPoint: "・期間中に発生したミス・ヒヤリハットの原因を一緒に振り返る",
      interviewQuestions: "・自分の仕事の品質に満足できた場面はありますか？",
      level5: "ミスがなく、品質の高い仕事を継続的に提供した",
      level4: "高い品質で業務を遂行し、ミスも少なかった",
      level3: "求められる品質を維持し、業務上問題となるミスはなかった",
      level2: "ミスがやや多く、確認が不十分なことがあった",
      level1: "ミスが頻発し、業務に支障をきたした",
    },
  ];
  const csv = stringifyCsv(rows, headers);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("evaluation_template_sample.csv")}`,
    },
  });
}
