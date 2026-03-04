import { NextRequest } from "next/server";
import { getAuthUser, successResponse, unauthorizedResponse } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  return successResponse(user);
}
