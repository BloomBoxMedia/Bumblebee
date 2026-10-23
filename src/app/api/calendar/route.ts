import { secretMatches } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { buildCalendar } from "@/lib/ics";
import { trackDeadlines } from "@/lib/tracker";

// Subscribable iCalendar feed of outstanding deadlines, protected by CALENDAR_TOKEN
// (calendar apps can't log in, so the token in the URL is the credential).
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!secretMatches(token, process.env.CALENDAR_TOKEN)) {
    return new Response("Not found", { status: 404 });
  }

  const events = trackDeadlines()
    .filter((d) => d.status !== "filed")
    .map((d) => ({
      uid: `${d.company.id}-${d.kind}-${d.periodEnd}@bumblebee`,
      date: d.due,
      summary: `${d.company.name}: ${d.title}`,
      description: `${d.authority}. Period ending ${formatDate(d.periodEnd)}.`,
    }));

  return new Response(buildCalendar("Bumblebee filing deadlines", events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
