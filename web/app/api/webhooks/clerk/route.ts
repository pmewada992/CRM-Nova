import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const supabase = createAdminSupabaseClient();

  switch (evt.type) {
    case "user.created": {
      const { id, first_name, last_name, email_addresses } = evt.data;
      const email = email_addresses[0]?.email_address ?? "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || email;

      // An Admin invite creates a placeholder row (clerk_user_id: null) so
      // role/team can be pre-assigned before sign-up — claim that row
      // instead of inserting a duplicate. Falls back to a fresh insert if
      // no pending invite row exists (e.g. the very first Admin).
      const { data: claimed } = await supabase
        .from("users")
        .update({ clerk_user_id: id, name })
        .eq("email", email)
        .is("clerk_user_id", null)
        .select("id");
      if (!claimed || claimed.length === 0) {
        await supabase.from("users").insert({
          clerk_user_id: id,
          name,
          email,
        });
      }
      break;
    }
    case "user.updated": {
      const { id, first_name, last_name, email_addresses } = evt.data;
      const email = email_addresses[0]?.email_address ?? "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || email;
      await supabase
        .from("users")
        .update({ name, email })
        .eq("clerk_user_id", id);
      break;
    }
    case "user.deleted": {
      const { id } = evt.data;
      if (id) {
        await supabase.from("users").update({ active: false }).eq("clerk_user_id", id);
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
