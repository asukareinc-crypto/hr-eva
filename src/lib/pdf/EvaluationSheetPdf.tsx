import { Document, Page, View } from "@react-pdf/renderer";
import { styles, COLORS, fmtDate, PdfHeader, PdfFooter, MetaGrid, T } from "./base";

const ROLE_LABEL: Record<string, string> = {
  SELF: "自己",
  MANAGER: "一次",
  FINAL: "最終",
  PEER: "同僚",
  SKIP_LEVEL: "上長",
};

export type EvaluationSheetData = {
  clientName: string;
  periodName: string;
  templateName: string;
  startDate: string;
  endDate: string;
  status: string;
  finalizedAt: string | null;
  employee: {
    name: string;
    code: string;
    department: string;
    position: string;
    grade: string;
  };
  /** 表示順に並んだ評価項目 */
  items: { id: string; name: string; weight: number; maxScore: number }[];
  /** ロール別の評価データ */
  assignments: {
    role: string;
    evaluatorName: string;
    submittedAt: string | null;
    scores: Record<string, { score: number | null; comment: string | null }>;
  }[];
  /** 参考総合点（重み付き平均） */
  overallAverage: string;
};

export function EvaluationSheetPdf({ data }: { data: EvaluationSheetData }) {
  const { items, assignments } = data;
  const scoreColWidth = `${Math.min(14, 44 / Math.max(1, assignments.length))}%`;

  const comments: { item: string; role: string; text: string }[] = [];
  for (const it of items) {
    for (const a of assignments) {
      const s = a.scores[it.id];
      if (s?.comment?.trim()) {
        comments.push({
          item: it.name,
          role: ROLE_LABEL[a.role] ?? a.role,
          text: s.comment.trim(),
        });
      }
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader
          title="評価シート"
          subtitle={`${data.employee.name}　／　${data.periodName}（${data.templateName}）`}
        />

        <MetaGrid
          items={[
            { label: "社員コード", value: data.employee.code },
            { label: "部署", value: data.employee.department },
            { label: "役職", value: data.employee.position },
            { label: "等級", value: data.employee.grade },
            {
              label: "評価対象期間",
              value: `${data.startDate} 〜 ${data.endDate}`,
              span: 2,
            },
            { label: "ステータス", value: data.status },
            {
              label: "確定日",
              value: data.finalizedAt ? fmtDate(data.finalizedAt) : "—",
            },
            {
              label: "総合（参考・重み付き平均）",
              value: `${data.overallAverage} 点`,
              span: 2,
            },
          ]}
        />

        <T style={styles.sectionTitle}>評価点一覧</T>
        <View style={styles.table}>
          <View style={styles.tr}>
            <View style={[styles.th, styles.cellBorderR, { width: "44%" }]}>
              <T>評価項目</T>
            </View>
            <View style={[styles.th, styles.cellBorderR, { width: "12%", textAlign: "center" }]}>
              <T>重み</T>
            </View>
            {assignments.map((a, i) => (
              <View
                key={a.role}
                style={[
                  styles.th,
                  i < assignments.length - 1 ? styles.cellBorderR : {},
                  { width: scoreColWidth, textAlign: "center" },
                ]}
              >
                <T>{ROLE_LABEL[a.role] ?? a.role}</T>
              </View>
            ))}
          </View>
          {items.map((it, ri) => (
            <View
              key={it.id}
              style={[styles.tr, ri === items.length - 1 ? styles.trLast : {}]}
            >
              <View style={[styles.td, styles.cellBorderR, { width: "44%" }]}>
                <T>{it.name}</T>
              </View>
              <View
                style={[
                  styles.td,
                  styles.cellBorderR,
                  { width: "12%", textAlign: "center", color: COLORS.muted },
                ]}
              >
                <T>{it.weight}</T>
              </View>
              {assignments.map((a, i) => {
                const s = a.scores[it.id];
                return (
                  <View
                    key={a.role}
                    style={[
                      styles.td,
                      i < assignments.length - 1 ? styles.cellBorderR : {},
                      { width: scoreColWidth, textAlign: "center" },
                    ]}
                  >
                    <T>
                      {s?.score != null ? s.score : "—"}
                      <T style={{ color: COLORS.faint, fontSize: 7 }}>
                        {" "}
                        / {it.maxScore}
                      </T>
                    </T>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <T style={styles.sectionTitle}>評価者</T>
        <View style={styles.table}>
          {assignments.map((a, i) => (
            <View
              key={a.role}
              style={[
                styles.tr,
                i === assignments.length - 1 ? styles.trLast : {},
              ]}
            >
              <View style={[styles.td, styles.cellBorderR, { width: "20%" }]}>
                <T>{ROLE_LABEL[a.role] ?? a.role}評価</T>
              </View>
              <View style={[styles.td, styles.cellBorderR, { width: "50%" }]}>
                <T>{a.evaluatorName}</T>
              </View>
              <View style={[styles.td, { width: "30%", color: COLORS.muted }]}>
                <T>
                  {a.submittedAt
                    ? `提出 ${fmtDate(a.submittedAt)}`
                    : "未提出"}
                </T>
              </View>
            </View>
          ))}
        </View>

        {comments.length > 0 && (
          <>
            <T style={styles.sectionTitle}>コメント</T>
            {comments.map((c, i) => (
              <View key={i} style={styles.box}>
                <T style={{ fontWeight: 700, marginBottom: 2 }}>
                  {c.item}
                  <T style={{ color: COLORS.muted, fontWeight: 400 }}>
                    [{c.role}評価]
                  </T>
                </T>
                <T>{c.text}</T>
              </View>
            ))}
          </>
        )}

        <PdfFooter clientName={data.clientName} />
      </Page>
    </Document>
  );
}
