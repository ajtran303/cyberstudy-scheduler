import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { auth } from "./auth";

export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status = 400
) {
  return NextResponse.json(
    { data: null, error: { code, message } },
    { status }
  );
}

export async function getAuthUser(req?: NextRequest) {
  // Try Bearer token first (for API consumers like the agent)
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const secret = new TextEncoder().encode(
          process.env.NEXTAUTH_SECRET || "dev-secret"
        );
        const { payload } = await jwtVerify(token, secret);
        return {
          id: payload.id as string,
          email: payload.email as string,
          name: payload.name as string,
        };
      } catch {
        return null;
      }
    }
  }

  // Fall back to NextAuth session (for browser-based access)
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name!,
  };
}

export function unauthorizedResponse() {
  return errorResponse("UNAUTHORIZED", "Authentication required", 401);
}
