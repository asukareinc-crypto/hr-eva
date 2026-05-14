import { Document, Page, View } from "@react-pdf/renderer";
import { styles, COLORS, PdfHeader, PdfFooter, MetaGrid, T } from "./base";

export type PeriodSummaryData = {
  clientName: string;
  periodName: string;
  templateName: string;
  startDate: string;
  endDate: string;
  statusLabel: string;
  rows: {
    employeeCode: string;
    employeeName: string;
    department: string;
    statusLabel: string;
    selfEvaluator: string;
    managerEvaluator: string;
    finalEvaluator: string;
    overallAverage: string;
  }[];
  counts: {
    total: number;
    finalized: number;
    inProgress: number;
    notStarted: number;
  };
};

const COLS: { key: keyof PeriodSummaryData["rows"][number]; label: string; width: string; center?: boolean }[] = [
  { key: "employeeCode", label: "コード", width: "11%" },
  { key: "employeeName", label: "氏名", width: "17%" },
  { key: "department", label: "部署", width: "15%" },
  { key: "statusLabel", label: "ステータス", width: "14%", center: true },
  { key: "selfEvaluator", label: "自己", width: "13%" },
  { key: "managerEvaluator", label: "一次", width: "13%" },
  { key: "finalEvaluator", label: "最終", width: "13%" },
  { key: "overallAverage", label: "総合", width: "9%", center: true },
];

export function PeriodSummaryPdf({ data }: { data: PeriodSummaryData }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <PdfHeader
          title="評価期間サマリー"
          subtitle={`${data.periodName}（${data.templateName}）`}
        />

        <MetaGrid
          items={[
            { label: "クライアント", value: data.clientName },
            {
              label: "評価対象期間",
              value: `${data.startDate} 〜 ${data.endDate}`,
            },
            { label: "期間ステータス", value: data.statusLabel },
            { label: "対象者数", value: `${data.counts.total} 名` },
            { label: "確定済み", value: `${data.counts.finalized} 名` },
            { label: "進行中", value: `${data.counts.inProgress} 名` },
            { label: "未着手", value: `${data.counts.notStarted} 名` },
            {
              label: "完了率",
              value:
                data.counts.total > 0
                  ? `${Math.round((data.counts.finalized / data.counts.total) * 100)}%`
                  : "—",
            },
          ]}
        />

        <T style={styles.sectionTitle}>対象者一覧</T>
        <View style={styles.table}>
          <View style={styles.tr}>
            {COLS.map((c, i) => (
              <View
                key={c.key}
                style={[
                  styles.th,
                  i < COLS.length - 1 ? styles.cellBorderR : {},
                  { width: c.width, textAlign: c.center ? "center" : "left" },
                ]}
              >
                <T>{c.label}</T>
              </View>
            ))}
          </View>
          {data.rows.length === 0 ? (
            <View style={[styles.tr, styles.trLast]}>
              <View style={[styles.td, { width: "100%", color: COLORS.faint }]}>
                <T>対象者がいません。</T>
              </View>
            </View>
          ) : (
            data.rows.map((r, ri) => (
              <View
                key={r.employeeCode + ri}
                style={[styles.tr, ri === data.rows.length - 1 ? styles.trLast : {}]}
              >
                {COLS.map((c, i) => (
                  <View
                    key={c.key}
                    style={[
                      styles.td,
                      i < COLS.length - 1 ? styles.cellBorderR : {},
                      { width: c.width, textAlign: c.center ? "center" : "left" },
                    ]}
                  >
                    <T>{r[c.key] || "—"}</T>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        <PdfFooter clientName={data.clientName} />
      </Page>
    </Document>
  );
}
