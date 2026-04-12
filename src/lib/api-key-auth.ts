import { prisma } from "@/lib/prisma";
import { getHouseholdUserId } from "@/lib/household";
import { createHash } from "crypto";

type AuthResult =
  | { success: true; userId: string }
  | { success: false; error: string; status: number };

/**
 * Authenticate a request via Bearer API key.
 * Returns the resolved household userId on success.
 */
export async function authenticateApiKey(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { success: false, error: "API key required", status: 401 };
  }

  const apiKey = authHeader.slice(7);
  const keyHash = createHash("sha256").update(apiKey).digest("hex");

  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKeyRecord) {
    return { success: false, error: "Invalid API key", status: 401 };
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsed: new Date() },
  });

  const userId = await getHouseholdUserId(apiKeyRecord.userId);
  return { success: true, userId };
}
