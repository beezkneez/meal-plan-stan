import { prisma } from "./prisma";

/**
 * Get the effective user ID for data queries.
 * If the user belongs to a household, return the owner's ID
 * so all data is shared.
 */
export async function getHouseholdUserId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { householdId: true },
  });

  return user?.householdId ?? userId;
}
