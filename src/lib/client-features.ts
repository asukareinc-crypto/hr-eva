import { prisma } from "@/lib/prisma";

/**
 * クライアント企業の機能トグルを取得。
 * 賃金・有給の表示可否を制御する。
 */
export type ClientFeatures = {
  wageEnabled: boolean;
  leaveEnabled: boolean;
};

export async function getClientFeatures(clientId: string | null | undefined): Promise<ClientFeatures> {
  if (!clientId) return { wageEnabled: true, leaveEnabled: true };
  const c = await prisma.client.findUnique({
    where: { id: clientId },
    select: { wageEnabled: true, leaveEnabled: true },
  });
  return {
    wageEnabled: c?.wageEnabled ?? true,
    leaveEnabled: c?.leaveEnabled ?? true,
  };
}
