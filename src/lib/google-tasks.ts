import { getGoogleAccessToken } from "./google-calendar";

interface GoogleTaskList {
  id: string;
  title: string;
  updated: string;
}

interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: string; // "needsAction" | "completed"
  due?: string;
}

export { getGoogleAccessToken };

export async function fetchTaskLists(
  accessToken: string
): Promise<GoogleTaskList[]> {
  const res = await fetch(
    "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.items ?? []).map((list: GoogleTaskList) => ({
    id: list.id,
    title: list.title,
    updated: list.updated,
  }));
}

export async function fetchTasks(
  accessToken: string,
  taskListId: string
): Promise<GoogleTask[]> {
  const params = new URLSearchParams({
    showCompleted: "false",
    showHidden: "false",
    maxResults: "100",
  });

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return (data.items ?? [])
    .filter((t: GoogleTask) => t.status === "needsAction" && t.title?.trim())
    .map((t: GoogleTask) => ({
      id: t.id,
      title: t.title,
      notes: t.notes,
      status: t.status,
      due: t.due,
    }));
}

export async function completeTask(
  accessToken: string,
  taskListId: string,
  taskId: string
): Promise<boolean> {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "completed" }),
    }
  );

  return res.ok;
}
