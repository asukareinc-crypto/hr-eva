"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function createTenant(formData: FormData) {
  await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const tenant = await prisma.tenant.create({ data: { name } });

  // 初期社労士ユーザー
  const adminEmail = String(formData.get("adminEmail") ?? "").trim().toLowerCase();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "");
  if (adminEmail && adminName && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: "SR_ADMIN",
        tenantId: tenant.id,
      },
    });
  }
  revalidatePath("/admin/tenants");
  redirect(`/admin/tenants/${tenant.id}`);
}

export async function updateTenant(id: string, formData: FormData) {
  await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const isActive = formData.get("isActive") === "on";
  if (!name) return;
  await prisma.tenant.update({ where: { id }, data: { name, isActive } });
  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${id}`);
}
