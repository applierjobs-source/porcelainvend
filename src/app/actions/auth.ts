"use server";

import { hash } from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  businessName: z.string().min(1).max(200),
});

export async function registerUser(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    businessName: formData.get("businessName"),
  };
  const parsed = signupSchema.safeParse({
    email: String(raw.email ?? ""),
    password: String(raw.password ?? ""),
    businessName: String(raw.businessName ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const { email, password, businessName } = parsed.data;
  const passwordHash = await hash(password, 12);
  try {
    await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        businessName: businessName.trim(),
      },
    });
  } catch {
    return { ok: false, error: "Email already registered" };
  }
  return { ok: true };
}
