import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cycleDay } from "./rewards";

const input = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
export type RewardStatus = { day: number; claimedToday: boolean; promo: number; paid: number; today: string; lastDate: string | null };
export const getRewards = createServerFn({ method: "POST" }).inputValidator((d: unknown) => input.parse(d)).handler(async ({ data }): Promise<RewardStatus> => {
  const { hashEntryToken } = await import("./voice-entry.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: w, error } = await supabaseAdmin.from("voice_wallets").select("checkin_day, last_checkin_date, promo_coins, paid_coins").eq("token_hash", await hashEntryToken(data.token)).maybeSingle();
  if (error || !w) throw new Error("Não foi possível consultar suas recompensas.");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return { day: cycleDay(w.checkin_day, w.last_checkin_date, today), claimedToday: w.last_checkin_date === today, promo: w.promo_coins, paid: w.paid_coins, today, lastDate: w.last_checkin_date };
});
export const claimCheckin = createServerFn({ method: "POST" }).inputValidator((d: unknown) => input.parse(d)).handler(async ({ data }) => {
  const { hashEntryToken } = await import("./voice-entry.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: result, error } = await supabaseAdmin.rpc("claim_daily_checkin", { p_token_hash: await hashEntryToken(data.token) });
  if (error) throw new Error("Não foi possível fazer o check-in. Tente novamente.");
  return z.object({ claimed: z.boolean(), day: z.number().int(), reward: z.number().int(), promo: z.number().int(), paid: z.number().int(), today: z.string() }).parse(result);
});