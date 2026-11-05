import { checkAndFireEscalations } from "@/lib/escalations";

const ESCALATION_CHECK_SECRET = process.env.ESCALATION_CHECK_SECRET ?? "";

export async function POST(request: Request) {
  const provided = request.headers.get("x-escalation-secret");
  if (!ESCALATION_CHECK_SECRET || provided !== ESCALATION_CHECK_SECRET) {
    return new Response("Invalid secret", { status: 401 });
  }
  const fired = await checkAndFireEscalations();
  return Response.json({ fired });
}

export async function GET() {
  return new Response("Escalation check endpoint is live", { status: 200 });
}
