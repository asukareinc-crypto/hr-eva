import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { ensureFonts } from "./base";

type PdfDocument = Parameters<typeof renderToBuffer>[0];

/**
 * PDF ドキュメントをレンダリングして application/pdf レスポンスを返す。
 * フォントはリクエスト origin から取得するため request を渡す。
 */
export async function pdfResponse(
  request: Request,
  doc: PdfDocument,
  filename: string
): Promise<NextResponse> {
  ensureFonts(new URL(request.url).origin);
  const buffer = await renderToBuffer(doc);
  // 日本語ファイル名は RFC 5987 形式でエンコード
  const encoded = encodeURIComponent(filename);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
