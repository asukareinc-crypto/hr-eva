import Link from "next/link";
import { requireClientAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/Shell";
import { Btn, Empty, Field, Input, Select, Textarea } from "@/components/ui";
import {
  createPulseQuestion,
  updatePulseQuestion,
  deletePulseQuestion,
} from "@/app/pulse/actions";

const TYPE_LABEL: Record<string, string> = {
  SCORE_5: "5段階評価",
  TEXT: "自由記述",
  YES_NO: "はい / いいえ",
};

export default async function PulseQuestionsPage() {
  const session = await requireClientAdmin();
  const questions = await prisma.pulseQuestion.findMany({
    where: { clientId: session.user.clientId! },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="パルスサーベイ 設問管理"
        description="月次サーベイで毎月聞く設問を編集します"
        actions={
          <Link href="/client/pulse" className="text-sm text-slate-600 underline-offset-2 hover:underline">
            ← サーベイ一覧
          </Link>
        }
      />

      {questions.length === 0 ? (
        <Empty message="設問がまだありません" />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id} className="p-3 space-y-2">
              <form
                action={async (fd) => {
                  "use server";
                  await updatePulseQuestion(q.id, fd);
                }}
                className="space-y-2"
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-xs text-slate-500">#{q.sortOrder} ・ {TYPE_LABEL[q.type]}</div>
                  <label className="flex items-center gap-1 text-xs text-slate-700">
                    <input type="checkbox" name="isActive" defaultChecked={q.isActive} />
                    有効
                  </label>
                </div>
                <Input name="text" defaultValue={q.text} required />
                <Textarea
                  name="description"
                  defaultValue={q.description ?? ""}
                  placeholder="補足説明（任意）"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="設問タイプ">
                    <Select name="type" defaultValue={q.type}>
                      <option value="SCORE_5">5段階評価</option>
                      <option value="TEXT">自由記述</option>
                      <option value="YES_NO">はい / いいえ</option>
                    </Select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm pt-6">
                    <input type="checkbox" name="allowComment" defaultChecked={q.allowComment} />
                    コメント欄を併設（5段階の場合）
                  </label>
                </div>
                <div className="flex gap-2">
                  <Btn type="submit" variant="secondary">更新</Btn>
                  <DeleteBtn id={q.id} />
                </div>
              </form>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4">
        <h2 className="font-semibold mb-2 text-sm">設問を追加</h2>
        <form action={createPulseQuestion} className="space-y-2 max-w-2xl">
          <Field label="設問">
            <Input name="text" required placeholder="例: 今月の仕事は充実していましたか？" />
          </Field>
          <Field label="補足説明（任意）">
            <Textarea name="description" placeholder="例: 1=全くそう思わない / 5=とてもそう思う" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="設問タイプ">
              <Select name="type">
                <option value="SCORE_5">5段階評価</option>
                <option value="TEXT">自由記述</option>
                <option value="YES_NO">はい / いいえ</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm pt-6">
              <input type="checkbox" name="allowComment" />
              コメント欄を併設（5段階の場合）
            </label>
          </div>
          <Btn type="submit">追加</Btn>
        </form>
      </Card>
    </div>
  );
}

function DeleteBtn({ id }: { id: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await deletePulseQuestion(id);
      }}
    >
      <Btn type="submit" variant="danger">削除</Btn>
    </form>
  );
}
