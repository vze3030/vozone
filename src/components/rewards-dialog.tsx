import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, Check, Gift, Play, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { claimCheckin, getRewards, type RewardStatus } from "@/lib/rewards.functions";
import { checkinReward, shareApp } from "@/lib/rewards";

export function RewardsDialog({ open, onOpenChange, onBalance }: { open: boolean; onOpenChange: (open: boolean) => void; onBalance: (balance: { promo: number; paid: number }) => void }) {
  const get = useServerFn(getRewards);
  const claim = useServerFn(claimCheckin);
  const [status, setStatus] = useState<RewardStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    setStatus(null); setMessage(""); setError("");
    const token = localStorage.getItem("vz_wallet");
    if (!token) { setError("Entre novamente para acessar suas moedas."); return; }
    get({ data: { token } }).then((result) => { if (!disposed) { setStatus(result); onBalance({ promo: result.promo, paid: result.paid }); } }).catch(() => { if (!disposed) setError("Não foi possível carregar suas recompensas."); });
    return () => { disposed = true; };
  }, [open, get, onBalance]);
  async function checkin() {
    const token = localStorage.getItem("vz_wallet");
    if (!token || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await claim({ data: { token } });
      setStatus({ day: result.day, claimedToday: true, promo: result.promo, paid: result.paid, today: result.today, lastDate: result.today });
      onBalance({ promo: result.promo, paid: result.paid });
      setMessage(result.claimed ? result.day === 30 ? "Super Bônus! +30 moedas no seu saldo." : "+1 moeda no seu saldo!" : "Seu check-in de hoje já foi recebido.");
    } catch { setError("Não foi possível fazer o check-in. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
      <DialogTitle className="flex items-center gap-2"><Gift className="text-primary" size={22} /> Ganhar Moedas Grátis</DialogTitle>
      <DialogDescription>Check-in diário e moedas de bônus</DialogDescription>
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold"><CalendarCheck size={18} /> Check-in Diário</h2><span className="text-sm text-muted-foreground">{status ? `Dia ${status.day} / 30` : "Carregando..."}</span></div>
        <div className="grid grid-cols-6 gap-1.5" aria-label="Calendário de check-in de 30 dias">
          {Array.from({ length: 30 }, (_, i) => {
            const day = i + 1;
            const completed = status && (day < status.day || day === status.day && status.claimedToday);
            const current = status?.day === day;
            return <div key={day} aria-label={`Dia ${day}: ${checkinReward(day)} moedas${completed ? ", concluído" : ""}`} className={`flex h-14 flex-col items-center justify-center rounded-md border text-xs ${completed ? "border-primary bg-primary/15 text-primary" : current ? "border-primary bg-accent text-accent-foreground" : "border-border bg-muted/20 text-muted-foreground"}`}>
              <span className="font-bold">{completed ? <Check size={14} /> : day}</span><span>+{checkinReward(day)}</span>
            </div>;
          })}
        </div>
        <p className="text-xs text-muted-foreground">30 dias seguidos · Dia 30: +30 moedas · Horário de Brasília</p>
        <Button onClick={checkin} disabled={!status || busy || status.claimedToday} className="w-full gap-2"><CalendarCheck size={18} /> {busy ? "Recebendo..." : status?.claimedToday ? "Check-in de hoje recebido" : "Fazer Check-in"}</Button>
      </section>
      <section className="space-y-2 border-t border-border pt-4">
        <h2 className="flex items-center gap-2 font-bold"><Play size={18} /> Vídeos com recompensas</h2>
        <div className="grid grid-cols-3 gap-2">
          {[["Menos de 1 min", "+1"], ["1 a <5 min", "+3"], ["5 min ou mais", "+5"]].map(([duration, value]) => <div key={duration} className="flex min-h-20 flex-col items-center justify-center rounded-md border border-border px-1 text-center"><span className="text-lg font-bold text-primary">{value} 🪙</span><span className="text-xs text-muted-foreground">{duration}</span></div>)}
        </div>
        <Button variant="secondary" disabled className="w-full"><Play size={16} /> Vídeos indisponíveis</Button>
        <p className="text-xs text-muted-foreground">Nenhum anúncio disponível no momento.</p>
      </section>
      {message && <p role="status" className="text-center text-sm text-primary">{message}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </DialogContent>
  </Dialog>;
}

export function ShareButton({ className }: { className?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className={className}>
    <Button variant="secondary" disabled={busy} className="h-auto w-full gap-2 whitespace-normal py-3" onClick={async () => {
      setBusy(true); setMessage("");
      try { const result = await shareApp(); if (result === "copied") setMessage("Link copiado! Compartilhe com seus amigos em qualquer rede social!"); }
      catch { setMessage("Não foi possível compartilhar. Tente novamente."); }
      finally { setBusy(false); }
    }}><Share2 size={18} className="shrink-0" /> Compartilhar Aplicativo com Amigos</Button>
    {message && <p role="status" className="mt-2 text-center text-xs text-muted-foreground">{message}</p>}
  </div>;
}