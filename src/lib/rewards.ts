export const SHARE_URL = "https://vozone.lovable.app";
export const SHARE_TEXT = "Olha que top esse aplicativo de chat de voz aleatório para fazer amigos e conversar na hora! Entra aí: vozone.lovable.app";
export function checkinReward(day: number) { return day === 30 ? 30 : day >= 1 && day <= 29 ? 1 : 0; }
export function videoReward(seconds: number) { return seconds <= 0 ? 0 : seconds < 60 ? 1 : seconds < 300 ? 3 : 5; }
export function cycleDay(day: number, lastDate: string | null, today: string) {
  if (lastDate === today) return day;
  const yesterday = new Date(`${today}T12:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return lastDate === yesterday.toISOString().slice(0, 10) && day >= 1 && day < 30 ? day + 1 : 1;
}
export async function shareApp(): Promise<"shared" | "copied" | "cancelled"> {
  if (navigator.share) {
    try { await navigator.share({ title: "Vozone", text: SHARE_TEXT, url: SHARE_URL }); return "shared"; }
    catch (error) { if (error instanceof Error && error.name === "AbortError") return "cancelled"; }
  }
  if (!navigator.clipboard?.writeText) throw new Error("Não foi possível copiar o link. Tente novamente.");
  await navigator.clipboard.writeText(SHARE_URL);
  return "copied";
}