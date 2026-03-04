import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-helpers";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        parsed.error.errors.map((e) => e.message).join(", "),
        422
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return errorResponse("UNAUTHORIZED", "Invalid credentials", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return errorResponse("UNAUTHORIZED", "Invalid credentials", 401);
    }

    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "dev-secret"
    );

    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    return successResponse({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch {
    return errorResponse("INTERNAL_ERROR", "Login failed", 500);
  }
}
