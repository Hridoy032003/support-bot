const API = "https://api.clickup.com/api/v2";

export type AssignedTask = {
  id: string;
  name: string;
  url: string;
  status: string;
  statusColor: string;
  priority: string | null;
  priorityColor: string | null;
  list: string;
  dueMs: number | null;
};

export type AssignedTasksResult =
  | { kind: "ok"; tasks: AssignedTask[] }
  | { kind: "not-configured" }
  | { kind: "no-match" }
  | { kind: "error" };

function headers() {
  return { Authorization: process.env.CLICKUP_API_TOKEN ?? "" };
}

/** ClickUp user id whose account email matches the signed-in Google email. */
async function findClickUpUserId(email: string, teamId: string): Promise<number | null> {
  const res = await fetch(`${API}/team/${teamId}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`ClickUp team lookup failed: ${res.status}`);
  const data = await res.json();
  const members: Array<{ user?: { id?: number; email?: string } }> = data?.team?.members ?? [];
  const match = members.find((m) => m.user?.email?.toLowerCase() === email.toLowerCase());
  return match?.user?.id ?? null;
}

export async function getAssignedTasks(email: string): Promise<AssignedTasksResult> {
  const teamId = process.env.CLICKUP_TEAM_ID;
  if (!process.env.CLICKUP_API_TOKEN || !teamId) return { kind: "not-configured" };

  try {
    const userId = await findClickUpUserId(email, teamId);
    if (userId === null) return { kind: "no-match" };

    const query = new URLSearchParams({
      "assignees[]": String(userId),
      subtasks: "true",
      include_closed: "false",
      order_by: "due_date",
      page: "0",
    });
    const res = await fetch(`${API}/team/${teamId}/task?${query}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`ClickUp tasks failed: ${res.status}`);
    const data = await res.json();

    const tasks: AssignedTask[] = (data?.tasks ?? []).map(
      (t: {
        id: string;
        name: string;
        url: string;
        status?: { status?: string; color?: string };
        priority?: { priority?: string; color?: string } | null;
        list?: { name?: string };
        due_date?: string | null;
      }) => ({
        id: t.id,
        name: t.name,
        url: t.url,
        status: t.status?.status ?? "",
        statusColor: t.status?.color ?? "#6b7280",
        priority: t.priority?.priority ?? null,
        priorityColor: t.priority?.color ?? null,
        list: t.list?.name ?? "",
        dueMs: t.due_date ? Number(t.due_date) : null,
      })
    );

    // Overdue and soonest first; tasks without a due date last.
    tasks.sort((a, b) => (a.dueMs ?? Infinity) - (b.dueMs ?? Infinity));
    return { kind: "ok", tasks };
  } catch (err) {
    console.error("Failed to load assigned tasks:", err);
    return { kind: "error" };
  }
}
