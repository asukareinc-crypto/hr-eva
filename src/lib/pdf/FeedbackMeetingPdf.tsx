import { Document, Page, View } from "@react-pdf/renderer";
import { styles, COLORS, fmtDate, PdfHeader, PdfFooter, MetaGrid, T } from "./base";

export type FeedbackMeetingData = {
  clientName: string;
  periodName: string;
  employee: {
    name: string;
    code: string;
    department: string;
    position: string;
    grade: string;
  };
  overallAverage: string;
  scheduledDate: string | null;
  conductedDate: string | null;
  conductedByName: string | null;
  goods: string[];
  improves: string[];
  goal: string | null;
  /** 事前折り返し済みの注記文 */
  note: string;
};

function ListBox({
  title,
  color,
  bg,
  entries,
}: {
  title: string;
  color: string;
  bg: string;
  entries: string[];
}) {
  return (
    <View
      style={{
        width: "50%",
        paddingRight: 4,
      }}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: COLORS.line,
          borderRadius: 3,
          backgroundColor: bg,
          padding: 8,
          minHeight: 130,
        }}
      >
        <T style={{ fontWeight: 700, color, marginBottom: 5 }}>{title}</T>
        {entries.length === 0 ? (
          <T style={{ color: COLORS.faint }}>（記入なし）</T>
        ) : (
          entries.map((e, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
              <T style={{ width: 14, fontWeight: 700, color }}>
                {["①", "②", "③", "④", "⑤"][i] ?? `${i + 1}.`}
              </T>
              <T style={{ flex: 1 }}>{e}</T>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

export function FeedbackMeetingPdf({ data }: { data: FeedbackMeetingData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfHeader
          title="フィードバック面談シート"
          subtitle={`${data.employee.name}　／　${data.periodName}`}
        />

        <MetaGrid
          items={[
            { label: "社員コード", value: data.employee.code },
            { label: "部署", value: data.employee.department },
            { label: "役職", value: data.employee.position },
            { label: "等級", value: data.employee.grade },
            {
              label: "面談予定日",
              value: data.scheduledDate ? fmtDate(data.scheduledDate) : "—",
            },
            {
              label: "面談実施日",
              value: data.conductedDate ? fmtDate(data.conductedDate) : "—",
            },
            { label: "実施者", value: data.conductedByName ?? "—" },
            {
              label: "総合（参考・重み付き平均）",
              value: `${data.overallAverage} 点`,
            },
          ]}
        />

        <T style={styles.sectionTitle}>面談内容</T>
        <View style={{ flexDirection: "row", marginBottom: 6 }}>
          <ListBox
            title="とても良かった項目（最大3つ）"
            color={COLORS.good}
            bg={COLORS.goodBg}
            entries={data.goods}
          />
          <ListBox
            title="更に取り組みを強化してほしい項目（最大3つ）"
            color={COLORS.improve}
            bg={COLORS.improveBg}
            entries={data.improves}
          />
        </View>

        <T style={styles.sectionTitle}>次期の目標</T>
        <View style={[styles.box, { minHeight: 70 }]}>
          <T>{data.goal?.trim() || "（記入なし）"}</T>
        </View>

        <View style={[styles.box, { backgroundColor: COLORS.headerBg, marginTop: 8 }]}>
          <T style={{ fontSize: 8, color: COLORS.muted }}>{data.note}</T>
        </View>

        <View style={{ flexDirection: "row", marginTop: 24 }}>
          <View style={{ width: "50%", paddingRight: 8 }}>
            <T style={{ fontSize: 8, color: COLORS.muted }}>本人確認（署名）</T>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: COLORS.text,
                marginTop: 18,
              }}
            />
          </View>
          <View style={{ width: "50%", paddingLeft: 8 }}>
            <T style={{ fontSize: 8, color: COLORS.muted }}>評価者確認（署名）</T>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: COLORS.text,
                marginTop: 18,
              }}
            />
          </View>
        </View>

        <PdfFooter clientName={data.clientName} />
      </Page>
    </Document>
  );
}
