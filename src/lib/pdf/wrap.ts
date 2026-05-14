import * as fontkit from "fontkit";

/**
 * react-pdf の textkit は CJK の折り返し位置に必ずハイフンを挿入してしまうため、
 * fontkit で実測して自前で改行 (\n) を挿入する。pdfResponse から渡される
 * リクエスト origin 経由でフォントを取得し、プロセス内でキャッシュする。
 */

// fontkit には型定義が無いため最小限のインターフェースを定義
type FontkitFont = {
  unitsPerEm: number;
  layout: (text: string) => { advanceWidth: number };
};

type FontPair = { regular: FontkitFont; bold: FontkitFont };
let cache: FontPair | null = null;

export async function loadPdfFonts(baseUrl: string): Promise<FontPair> {
  if (cache) return cache;
  const [reg, bold] = await Promise.all([
    fetch(`${baseUrl}/fonts/NotoSansJP-Regular.woff`).then((r) => r.arrayBuffer()),
    fetch(`${baseUrl}/fonts/NotoSansJP-Bold.woff`).then((r) => r.arrayBuffer()),
  ]);
  cache = {
    regular: fontkit.create(Buffer.from(reg)) as unknown as FontkitFont,
    bold: fontkit.create(Buffer.from(bold)) as unknown as FontkitFont,
  };
  return cache;
}

function measure(font: FontkitFont, text: string, fontSize: number): number {
  if (!text) return 0;
  const run = font.layout(text);
  return (run.advanceWidth / font.unitsPerEm) * fontSize;
}

/**
 * テキストを maxWidth(pt) に収まるよう改行を挿入して返す。
 * ラテン語/数字の連なりは単語単位、CJK は1文字単位で折り返す。
 * 既存の改行は維持する。
 */
export function wrapText(
  font: FontkitFont,
  text: string,
  maxWidthPt: number,
  fontSize: number
): string {
  if (!text) return text;
  // ラテン語(英数記号)の塊 / 空白 / それ以外1文字 にトークン化
  const tokenRe = /[A-Za-z0-9.,!?;:'"()/_+%@&#-]+|[ \t]+|[\s\S]/g;
  const outParas: string[] = [];

  for (const para of text.split("\n")) {
    const tokens = para.match(tokenRe) ?? [];
    let line = "";
    let lineW = 0;
    for (const tok of tokens) {
      const w = measure(font, tok, fontSize);
      const isSpace = /^[ \t]+$/.test(tok);
      if (lineW + w > maxWidthPt && line !== "") {
        outParas.push(line);
        if (isSpace) {
          line = "";
          lineW = 0;
        } else {
          line = tok;
          lineW = w;
        }
      } else {
        line += tok;
        lineW += w;
      }
    }
    outParas.push(line);
  }
  return outParas.join("\n");
}

/** bold かどうかで使うフォントを切り替えて wrapText を呼ぶ薄いヘルパー。 */
export function makeWrapper(fonts: FontPair) {
  return (
    text: string | null | undefined,
    maxWidthPt: number,
    fontSize: number,
    bold = false
  ): string => {
    if (!text) return text ?? "";
    return wrapText(bold ? fonts.bold : fonts.regular, text, maxWidthPt, fontSize);
  };
}
