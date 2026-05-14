import type { ComponentProps } from "react";
import { Font, StyleSheet, Text, View } from "@react-pdf/renderer";

let registeredFor: string | null = null;

/**
 * Noto Sans JP（日本語＋基本ラテン）を登録。
 * フォントは public/fonts に配置し、リクエスト origin から HTTP 取得する。
 * process.cwd() はデプロイ環境やローカル起動方法で揺れるため、ファイルパス解決に依存しない。
 */
export function ensureFonts(baseUrl: string) {
  if (registeredFor === baseUrl) return;
  Font.register({
    family: "NotoSansJP",
    fonts: [
      { src: `${baseUrl}/fonts/NotoSansJP-Regular.woff`, fontWeight: 400 },
      { src: `${baseUrl}/fonts/NotoSansJP-Bold.woff`, fontWeight: 700 },
    ],
  });
  // 日本語は単語境界が無いため1文字単位で折り返す。
  // ただしラテン/数字のみの語（日付・コード等）は途中で割らない。
  Font.registerHyphenationCallback((word) => [word]);
  registeredFor = baseUrl;
}

/**
 * <Text> の薄いラッパー。日本語の折り返しは wrap.ts による事前折り返し
 * （\n の挿入）で行うため、ここでは素の <Text> をそのまま使う。
 */
export function T(props: ComponentProps<typeof Text>) {
  return <Text {...props} />;
}

export const COLORS = {
  text: "#1e293b",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  headerBg: "#f1f5f9",
  good: "#15803d",
  improve: "#b45309",
  goodBg: "#f0fdf4",
  improveBg: "#fffbeb",
};

export const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 9,
    color: COLORS.text,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    lineHeight: 1.5,
  },
  docTitle: { fontSize: 16, fontWeight: 700 },
  docSubtitle: { fontSize: 10, color: COLORS.muted, marginTop: 2 },
  headerRule: {
    marginTop: 8,
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.text,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 5,
    marginTop: 12,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 3,
  },
  metaCell: {
    width: "25%",
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: COLORS.line,
  },
  metaCellLast: { borderRightWidth: 0 },
  metaLabel: { fontSize: 7, color: COLORS.faint },
  metaValue: { fontSize: 9.5, fontWeight: 700, marginTop: 1 },
  table: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 3,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  trLast: { borderBottomWidth: 0 },
  th: {
    backgroundColor: COLORS.headerBg,
    fontWeight: 700,
    fontSize: 8,
    color: COLORS.muted,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  td: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 8.5,
  },
  cellBorderR: { borderRightWidth: 1, borderRightColor: COLORS.line },
  box: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 3,
    padding: 8,
    marginBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.faint,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 5,
  },
});

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

/** 全ページ共通のフッター（左: 出力元、右: ページ番号、中央: 出力日時） */
export function PdfFooter({ clientName }: { clientName: string }) {
  const generatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  return (
    <View style={styles.footer} fixed>
      <T>{clientName}</T>
      <Text>HR EVA で出力 {generatedAt}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

/** ドキュメント上部の見出し（タイトル + サブタイトル + 区切り線） */
export function PdfHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View>
      <T style={styles.docTitle}>{title}</T>
      {subtitle ? <T style={styles.docSubtitle}>{subtitle}</T> : null}
      <View style={styles.headerRule} />
    </View>
  );
}

/** ラベル付きメタ情報のグリッド（4列、span で 2 列分にできる） */
export function MetaGrid({
  items,
}: {
  items: { label: string; value: string; span?: 1 | 2 }[];
}) {
  let col = 0;
  return (
    <View style={styles.metaGrid}>
      {items.map((it, i) => {
        const span = it.span ?? 1;
        col += span;
        const endsRow = col % 4 === 0;
        if (col >= 4) col = 0;
        return (
          <View
            key={i}
            style={[
              styles.metaCell,
              { width: span === 2 ? "50%" : "25%" },
              endsRow ? styles.metaCellLast : {},
            ]}
          >
            <T style={styles.metaLabel}>{it.label}</T>
            <T style={styles.metaValue}>{it.value}</T>
          </View>
        );
      })}
    </View>
  );
}
