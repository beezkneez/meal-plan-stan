import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGoogleAccessToken } from "@/lib/google-calendar";
import { fetchTaskLists } from "@/lib/google-tasks";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getGoogleAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google account not connected or missing tasks scope" },
      { status: 403 }
    );
  }

  const result = await fetchTaskLists(accessToken);
  if (result.error) {
    return NextResponse.json(
      { lists: [], error: result.error },
      { status: 502 }
    );
  }
  return NextResponse.json({ lists: result.lists });
}
