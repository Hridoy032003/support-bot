import type { AssignedTask } from "@/lib/clickup";

const DAY_MS = 24 * 60 * 60 * 1000;

export const DUE_FILTERS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "week", label: "Next 7 days" },
  { value: "none", label: "No due date" },
] as const;
export type DueFilter = (typeof DUE_FILTERS)[number]["value"];

export type TaskFilters = {
  q: string;
  status: string;
  priority: string;
  list: string;
  due: DueFilter;
};

/** Whole days from today (IST) to the due date: negative = overdue, 0 = today. */
export function dueDayDiff(dueMs: number): number {
  const ist = (ms: number) => new Date(new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })).getTime();
  return Math.round((ist(dueMs) - ist(Date.now())) / DAY_MS);
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseTaskFilters(params: RawParams): TaskFilters {
  const due = first(params.due);
  return {
    q: first(params.q),
    status: first(params.status),
    priority: first(params.priority),
    list: first(params.list),
    due: DUE_FILTERS.some((f) => f.value === due) ? (due as DueFilter) : "all",
  };
}

export function hasActiveFilters(f: TaskFilters): boolean {
  return !!(f.q || f.status || f.priority || f.list || f.due !== "all");
}

export function applyTaskFilters(tasks: AssignedTask[], f: TaskFilters): AssignedTask[] {
  const q = f.q.toLowerCase();
  return tasks.filter((t) => {
    if (q && !`${t.name} ${t.list}`.toLowerCase().includes(q)) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.priority && (t.priority ?? "none") !== f.priority) return false;
    if (f.list && t.list !== f.list) return false;
    if (f.due !== "all") {
      if (f.due === "none") return t.dueMs === null;
      if (t.dueMs === null) return false;
      const diff = dueDayDiff(t.dueMs);
      if (f.due === "overdue" && diff >= 0) return false;
      if (f.due === "today" && diff !== 0) return false;
      if (f.due === "week" && (diff < 0 || diff > 7)) return false;
    }
    return true;
  });
}

export function distinct(values: Array<string | null>): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

/** Builds a /tasks URL, keeping the current filters and overriding the given ones. */
export function tasksHref(current: TaskFilters, override: Partial<TaskFilters>): string {
  const merged = { ...current, ...override };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.status) params.set("status", merged.status);
  if (merged.priority) params.set("priority", merged.priority);
  if (merged.list) params.set("list", merged.list);
  if (merged.due !== "all") params.set("due", merged.due);
  const qs = params.toString();
  return qs ? `/tasks?${qs}` : "/tasks";
}
