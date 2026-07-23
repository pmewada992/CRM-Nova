import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase";
import { requireAppUser, canAssignLeads } from "@/lib/permissions";
import { csvImportBatchSchema } from "@/lib/validations/lead";

/**
 * Inserts one batch (chunk) of a CSV import. The client parses the whole
 * file and posts it here in batches of up to 1000 rows, so a 30k-row
 * import never has to fit in a single request. Duplicate phone numbers
 * are flagged in the response, not blocked — the row still gets imported.
 */
export async function POST(req: Request) {
  const user = await requireAppUser();

  const body = await req.json();
  const parsed = csvImportBatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { leadBy, rows } = parsed.data;

  const supabase = createServerSupabaseClient();
  const phones = rows.map((r) => r.phone);
  const { data: existing, error: dupError } = await supabase
    .from("leads")
    .select("phone")
    .in("phone", phones);
  if (dupError) {
    return NextResponse.json({ data: null, error: "Something went wrong." }, { status: 500 });
  }
  const duplicatePhones = new Set((existing as { phone: string }[]).map((r) => r.phone));

  // A client-supplied `leadBy` only counts from someone actually allowed to
  // assign lead credit to another BDE — never trust it otherwise.
  const resolvedLeadBy =
    leadBy && canAssignLeads(user) ? leadBy : user.team === "bde" ? user.id : null;
  const toInsert = rows.map((row) => ({
    name: row.name,
    phone: row.phone,
    email: row.email || null,
    linkedin: row.linkedin || null,
    visa_status: row.visa_status || null,
    graduation_date: row.graduation_date || null,
    lead_by: resolvedLeadBy,
  }));

  const { error: insertError } = await supabase.from("leads").insert(toInsert);
  if (insertError) {
    return NextResponse.json({ data: null, error: "Something went wrong." }, { status: 500 });
  }

  revalidatePath("/leads");
  return NextResponse.json({
    data: { inserted: rows.length, duplicateCount: duplicatePhones.size },
    error: null,
  });
}
