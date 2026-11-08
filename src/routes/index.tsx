import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  Phone, MessageCircle, History, UserPlus, ChevronUp, Mic, MicOff, PhoneOff, Send, ArrowLeft, Check, SkipForward, Flag, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { freshEntry, genderOptions, genderLabel, genderSymbol, reportReasons, reportSchema, type OwnGender } from "@/lib/voice-preferences";
import { submitReport } from "@/lib/reports.functions";
import { BuyCoinsDialog } from "@/components/buy-coins-dialog";
import { RewardsDialog, ShareButton } from "@/components/rewards-dialog";
import { AdSlot } from "@/components/ad-slot";
import { openWallet, spendSearchCoin } from "@/lib/wallet.functions";
import { createVoiceEntry, checkVoiceEntry, registerVoiceRoom, type EntryCredential } from "@/lib/voice-entry.functions";
import bunny from "@/assets/bunny.png";
import ghost from "@/assets/ghost.png";
import vozoneLogo from "@/assets/vozone_logo.png";

import { search, loadRelay, connectCall, listenInbox, sendDM, listenWarning, notifyWarning, type Me, type CallStatus } from "@/lib/voice";
import { trackVoiceSearch } from "@/lib/consent";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vozone — Bate-papo por voz aleatório" },
      { name: "description", content: "Converse por voz com pessoas aleatórias. Escolha quem você ouve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Vozone — Bate-papo por voz aleatório" },
      { property: "og:description", content: "Converse por voz com pessoas aleatórias." },
    ],
  }),
  component: App,
});

type Tab = "voz" | "msg" | "hist";
type Gender = "Todos" | "Mulheres" | "Homens";
type Mode = "Mundo" | "Brasil";
type Stage = "home" | "busca" | "chamada";
type Person = { id: string; name: string; gender: string; country: string };
type Call = Person & { date: number; secs: number };
type Msg = { from: "eu" | "ele"; text: string };

const SLIDES: { t: string; s: string }[] = [
  { t: "Fale com alguém novo.", s: "conversas por voz, anônimas e na hora" },
  { t: "Sem fotos, só vozes.", s: "seja você mesmo sem se preocupar" },
  { t: "Escolha quem você ouve.", s: "uma preferência e encontre alguém disponível" },
];

function load<T>(k: string, d: T): T {
  try { return JSON.parse(localStorage.getItem(k) || "") as T; } catch { return d; }
}
function save(k: string, v: unknown) { localStorage.setItem(k, JSON.stringify(v)); }
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function App() {
  const [tab, setTab] = useState<Tab>("voz");
  const [stage, setStage] = useState<Stage>("home");
  const [gender, setGender] = useState<Gender>("Todos");
  const [mode, setMode] = useState<Mode>("Mundo");
  const [menu, setMenu] = useState<"g" | "m" | "own" | null>(null);
  const [slide, setSlide] = useState(2);
  const [partner, setPartner] = useState<Person | null>(null);
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [history, setHistory] = useState<Call[]>([]);
  const [friends, setFriends] = useState<Person[]>([]);
  const [chats, setChats] = useState<Record<string, Msg[]>>({});
  const [openChat, setOpenChat] = useState<Person | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const endCall = useRef<(() => void) | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus>("connecting");
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const guestId = useRef("");
  const excluded = useRef(new Set<string>());
  const blocked = useRef(new Set<string>());
  const roomId = useRef("");
  const [reportTarget, setReportTarget] = useState<{ person: Person; room: string } | null>(null);
  const [reason, setReason] = useState<(typeof reportReasons)[number]["value"]>("shouting");
  const [details, setDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const credential = useRef<EntryCredential | null>(null);
  const [suspended, setSuspended] = useState(false);
  const callAttempt = useRef(0);
  const createEntry = useServerFn(createVoiceEntry);
  const openWalletFn = useServerFn(openWallet);
  const spendFn = useServerFn(spendSearchCoin);
  /** Only called when THIS user clicks to search; never when the other side leaves. */
  const payForSearch = async (): Promise<boolean> => {
    if (gender === "Todos") return true;
    const token = localStorage.getItem("vz_wallet");
    if (!token) { setError("Sua carteira de créditos não foi encontrada. Entre novamente."); return false; }
    try {
      const r = await spendFn({ data: { token, gender } });
      if (r.promo !== null && r.paid !== null) setCoins({ promo: r.promo, paid: r.paid });
      if (!r.ok) { setError("Você não tem créditos para buscar com filtro de gênero. Compre créditos ou escolha \"Todos\" (grátis)."); setBuyOpen(true); return false; }
      return true;
    } catch { setError("Não foi possível usar seu crédito. Tente novamente."); return false; }
  };
  const [coins, setCoins] = useState<{ promo: number; paid: number } | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const checkEntry = useServerFn(checkVoiceEntry);
  const registerRoom = useServerFn(registerVoiceRoom);
  const sendReport = useServerFn(submitReport);
  const startingRef = useRef(false);
  const alive = useRef(true);
  const secsRef = useRef(0);
  secsRef.current = secs;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      endCall.current?.();
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
  }, []);

  useEffect(() => {
    setHistory(load("vz_hist", [])); setFriends(load("vz_friends", [])); setChats(load("vz_chats", {}));
    guestId.current = freshEntry(localStorage).id;
    blocked.current = new Set(load<string[]>("vz_blocked", []));
    excluded.current = new Set(blocked.current);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!me) return;
    return listenInbox(me.id, (from, text) => {
      if (blocked.current.has(from.id)) return;
      setFriends((fs) => { if (fs.some((f) => f.id === from.id)) return fs; const n = [from, ...fs]; save("vz_friends", n); return n; });
      setChats((prev) => { const n = { ...prev, [from.id]: [...(prev[from.id] || []), { from: "ele" as const, text }] }; save("vz_chats", n); return n; });
    });
  }, [me]);
  const suspendRef = useRef(() => {});
  suspendRef.current = () => {
    hangupRef.current();
    credential.current = null;
    setMe(null); setOpenChat(null); setReportTarget(null);
    setGender("Todos"); setMode("Mundo"); setMenu(null); setTab("voz");
    setSuspended(true);
  };
  useEffect(() => {
    if (!me) return;
    let disposed = false;
    let checking = false;
    const verify = async () => {
      const entry = credential.current;
      if (!entry || checking) return;
      checking = true;
      try {
        const result = await checkEntry({ data: entry });
        if (!disposed && result.state !== "active") suspendRef.current();
      } catch { /* A lost request is not evidence of suspension; retry. */ }
      finally { checking = false; }
    };
    const stop = listenWarning(me.id, () => { void verify(); });
    const interval = setInterval(() => { void verify(); }, 2000);
    window.addEventListener("focus", verify);
    return () => { disposed = true; stop(); clearInterval(interval); window.removeEventListener("focus", verify); };
  }, [me?.id, checkEntry]);
  useEffect(() => { const i = setInterval(() => setSlide((s) => (s + 1) % 3), 4000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (stage !== "chamada" || callStatus !== "connected") return;
    const i = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(i);
  }, [stage, callStatus]);
  useEffect(() => {
    if (stage !== "busca" || !me) return;
    const country = mode === "Brasil" ? "🇧🇷 Brasil" : "🌏 Mundo";
    void loadRelay();
    return search(me, gender, country, async (room, peer, caller) => {
      const attempt = ++callAttempt.current;
      const entry = credential.current;
      if (!entry) { cancel(); return; }
      try {
        const result = await registerRoom({ data: { ...entry, room, peer: peer.id } });
        if (attempt !== callAttempt.current || !alive.current) return;
        if (!result.ok) { setError("Essa entrada não está disponível. Tente outra chamada."); cancel(); return; }
      } catch { setError("Não foi possível verificar a chamada. Tente novamente."); cancel(); return; }
      const media = stream.current;
      if (!media || !media.getAudioTracks().some((track) => track.readyState === "live")) {
        setError("O microfone foi desconectado. Conecte-o e tente novamente."); cancel(); return;
      }
      roomId.current = room;
      setPartner(peer); setSecs(0); setCallStatus("connecting"); setPlaybackBlocked(false); setStage("chamada");
      try {
        endCall.current = connectCall(room, caller, media, (audioEl.current ??= new Audio()),
          (message) => { if (message) { hangupRef.current(); setError(message); } else requeueRef.current(); }, setCallStatus, () => setPlaybackBlocked(true));
      } catch { setError("Não foi possível iniciar o áudio neste navegador."); cancel(); }
    }, (message) => { setError(message); cancel(); }, excluded.current);
  }, [stage, gender, mode, me]);

  const start = async () => {
    if (startingRef.current) return;
    startingRef.current = true; setStarting(true); setError(""); setNotice("");
    try {
      const entry = credential.current;
      if (!entry) return;
      const access = await checkEntry({ data: entry });
      if (access.state !== "active") { suspendRef.current(); return; }
      if (!(await payForSearch())) return;
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!alive.current || credential.current !== entry) { media.getTracks().forEach((track) => track.stop()); return; }
      stream.current = media;
      media.getAudioTracks().forEach((track) => { track.onended = () => { hangupRef.current(); setError("O microfone foi desconectado. Conecte-o e tente novamente."); }; });
      setMuted(false); setStage("busca"); void trackVoiceSearch();
    } catch (cause) {
      if (!alive.current) return;
      const name = cause instanceof Error ? cause.name : "";
      setError(name === "NotAllowedError" ? "Permita o acesso ao microfone no navegador para conversar." : name === "NotFoundError" ? "Nenhum microfone foi encontrado. Conecte um microfone e tente novamente." : "Não foi possível acessar o microfone. Verifique se ele está disponível e tente novamente.");
    } finally { startingRef.current = false; if (alive.current) setStarting(false); }
  };
  const stopMic = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  const cancel = () => { ++callAttempt.current; stopMic(); setStage("home"); };
  const hangup = (keepMic = false) => {
    ++callAttempt.current;
    if (partner) { const h = [{ ...partner, date: Date.now(), secs: secsRef.current }, ...history].slice(0, 50); setHistory(h); save("vz_hist", h); }
    endCall.current?.(); endCall.current = null;
    if (!keepMic) stopMic();
    else stream.current?.getAudioTracks().forEach((t) => { t.enabled = true; });
    setMuted(false); setPlaybackBlocked(false); setPartner(null); setStage("home");
  };
  const hangupRef = useRef(hangup); hangupRef.current = hangup;
  const next = async (userClicked: unknown = true) => {
    if (!partner) return;
    excluded.current.add(partner.id);
    hangup(true);
    if (userClicked !== false && !(await payForSearch())) { stopMic(); return; }
    if (stream.current?.getAudioTracks().some((t) => t.readyState === "live")) setStage("busca");
    else setError("O microfone foi desconectado. Conecte-o e tente novamente.");
  };
  const nextRef = useRef(next); nextRef.current = next;
  const requeueRef = useRef(() => { setNotice("A outra pessoa saiu. Procurando alguém novo..."); void nextRef.current(false); });
  const report = () => {
    if (!partner) return;
    const target = { person: partner, room: roomId.current };
    blocked.current.add(partner.id); excluded.current.add(partner.id);
    save("vz_blocked", [...blocked.current]);
    setFriends((fs) => { const remaining = fs.filter((f) => f.id !== partner.id); save("vz_friends", remaining); return remaining; });
    setReportTarget(target); setDetails(""); setReason("shouting"); setError("");
    setNotice("Contato bloqueado neste navegador."); hangup();
  };
  const confirmReport = async () => {
    const entry = credential.current;
    if (!me || !entry || !reportTarget || reportBusy) return;
    const input = reportSchema.safeParse({ reporter: me.id, target: reportTarget.person.id, room: reportTarget.room, reason, details });
    if (!input.success) { setError("Verifique os dados da denúncia."); return; }
    setReportBusy(true); setError("");
    try {
      const result = await sendReport({ data: { ...input.data, ...entry } });
      if (!result.ok) { setError(result.message); return; }
      notifyWarning(reportTarget.person.id);
      setNotice(result.message); setReportTarget(null);
    } catch { setError("A denúncia não foi registrada. O contato continua bloqueado; tente novamente."); }
    finally { setReportBusy(false); }
  };
  const toggleMute = () => { stream.current?.getAudioTracks().forEach((t) => (t.enabled = muted)); setMuted(!muted); };
  const addFriend = (p: Person) => {
    if (friends.some((f) => f.id === p.id)) return;
    const f = [p, ...friends]; setFriends(f); save("vz_friends", f);
  };
  const sendMsg = (p: Person, text: string) => {
    if (blocked.current.has(p.id)) return;
    const c = { ...chats, [p.id]: [...(chats[p.id] || []), { from: "eu" as const, text }] };
    setChats(c); save("vz_chats", c);
    if (me) sendDM(p.id, { id: me.id, name: me.name, gender: me.gender, country: "" }, text);
  };

  if (!ready) return <Screen><span /></Screen>;
  if (suspended) return <Screen>
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <Flag size={48} className="text-destructive" />
      <h1 className="text-3xl font-extrabold">Acesso suspenso</h1>
      <p role="alert" className="text-muted-foreground">Sua entrada foi suspensa após uma denúncia. A chamada foi encerrada como advertência.</p>
      <p className="text-muted-foreground">Respeite as outras pessoas. Não são permitidos gritos, música alta, conteúdo sexual ou assédio.</p>
    </div>
  </Screen>;
  if (!me) return <Onboard onDone={async (profile, location) => {
    const entry = await createEntry();
    credential.current = entry;
    guestId.current = entry.id;
    setMode(location); setMe({ ...profile, id: entry.id });
    try {
      const w = await openWalletFn({ data: { token: localStorage.getItem("vz_wallet"), nickname: profile.name } });
      localStorage.setItem("vz_wallet", w.token);
      setCoins({ promo: w.promo, paid: w.paid });
      if (w.welcome) setNotice(`Bem-vindo! Você ganhou ${w.promo} moedas de boas-vindas.`);
    } catch { setCoins(null); }
  }} />;

  if (stage === "busca") return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-accent animate-ring" />
          <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-accent">
            <img src={ghost} alt="Fantasminha" width={816} height={816} className="h-36 w-36 object-contain" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold leading-tight">Encontrando uma combinação...</h1>
        <p className="text-lg text-muted-foreground">Encontrar alguém que esteja acordado neste momento...</p>
      </div>
      <div className="p-5">
        <Button variant="ghost" size="lg" onClick={cancel} className="w-full rounded-full bg-destructive py-4 text-lg font-bold text-destructive-foreground">Cancelar pesquisa</Button>
      </div>
      <AdSlot />
    </Screen>
  );

  if (stage === "chamada" && partner) {
    const isFriend = friends.some((f) => f.id === partner.id);
    return (
      <Screen>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-accent">
            <img src={partner.gender === "F" ? bunny : ghost} alt="" width={816} height={816} className="h-36 w-36 object-contain" />
          </div>
          <h1 className="max-w-full break-words text-4xl font-extrabold">{partner.name} <GenderIndicator gender={partner.gender} /></h1>
          <p className="max-w-full break-words text-lg">{me.name} <GenderIndicator gender={me.gender} /></p>
          <p className="text-muted-foreground">{partner.country}</p>
          <p role="status" className="text-sm text-muted-foreground">{callStatus === "connected" ? "Áudio conectado" : callStatus === "reconnecting" ? "Reconectando áudio..." : "Conectando áudio..."}</p>
          {playbackBlocked && <Button variant="secondary" onClick={async () => {
            try { await audioEl.current?.play(); setPlaybackBlocked(false); } catch { setPlaybackBlocked(true); }
          }}>Ativar som</Button>}
          <p className="text-2xl font-bold text-primary-glow">{fmt(secs)}</p>
          <Button variant="ghost" size="lg" onClick={() => addFriend(partner)} disabled={isFriend}
            className="mt-2 flex items-center gap-2 rounded-full bg-secondary px-5 py-2 font-semibold">
            {isFriend ? <><Check size={18} /> Amigo adicionado</> : <><UserPlus size={18} /> Adicionar amigo</>}
          </Button>
          <Button variant="ghost" onClick={report} className="gap-2 text-destructive"><Flag size={18} /> Denunciar e bloquear</Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 p-5">
          <Button variant="ghost" size="lg" onClick={toggleMute} aria-label={muted ? "Ativar microfone" : "Silenciar microfone"} aria-pressed={muted} className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            {muted ? <MicOff /> : <Mic />}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => hangup()} aria-label="Desligar" className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
            <PhoneOff />
          </Button>
          <Button size="lg" onClick={next} className="h-16 gap-2 rounded-full px-5"><SkipForward size={22} /> Próximo</Button>
        </div>
        <AdSlot />
      </Screen>
    );
  }

  if (openChat) return (
    <ChatView person={openChat} msgs={chats[openChat.id] || []} onBack={() => setOpenChat(null)} onSend={(t) => sendMsg(openChat, t)} />
  );

  return (
    <Screen>
      <RewardsDialog open={rewardsOpen} onOpenChange={setRewardsOpen} onBalance={setCoins} />
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm">
          <DialogTitle>Meu perfil</DialogTitle>
          <DialogDescription>{me.name} · {genderLabel(me.gender)} · {mode}</DialogDescription>
          <div className="flex justify-between border-y border-border py-3 text-sm"><span>Moedas de bônus</span><strong>{coins?.promo ?? "—"}</strong></div>
          <div className="flex justify-between text-sm"><span>Moedas compradas</span><strong>{coins?.paid ?? "—"}</strong></div>
          <Button className="gap-2" onClick={() => { setProfileOpen(false); setRewardsOpen(true); }}><Gift size={18} /> Ganhar Moedas Grátis</Button>
          <ShareButton />
        </DialogContent>
      </Dialog>
      <Dialog open={reportTarget !== null} onOpenChange={(open) => { if (!open && !reportBusy) setReportTarget(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogTitle>Denunciar {reportTarget?.person.name}</DialogTitle>
          <DialogDescription>A chamada foi encerrada. Ao enviar, a entrada atual desse contato será suspensa como advertência, sem banimento permanente. Não gravamos áudio.</DialogDescription>
          <label htmlFor="report-reason" className="font-semibold">Motivo</label>
          <select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)} className="rounded-lg border border-border bg-card p-3">
            {reportReasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <label htmlFor="report-details" className="font-semibold">Detalhes (opcional)</label>
          <textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={3} className="rounded-lg border border-border bg-card p-3" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button disabled={reportBusy} onClick={confirmReport}><Flag size={18} /> {reportBusy ? "Enviando..." : "Enviar denúncia"}</Button>
        </DialogContent>
      </Dialog>
      <header className="flex items-center justify-between px-5 pt-5">
        <Button variant="ghost" size="icon" aria-label="Meu perfil" onClick={() => setProfileOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent">
          <img src={ghost} alt="Perfil" width={816} height={816} className="h-11 w-11 object-contain" />
        </Button>
        <img src={vozoneLogo} alt="Vozone" width={1000} height={280} className="h-7 w-28 object-contain" />
        <div className="flex items-center gap-1 text-muted-foreground">
          {coins && <Button variant="secondary" size="sm" onClick={() => setBuyOpen(true)} aria-label="Saldo de moedas" className="rounded-full px-2 text-sm font-bold">🪙 {coins.promo + coins.paid} +</Button>}
          <BuyCoinsDialog open={buyOpen} onOpenChange={setBuyOpen} onBalance={setCoins} />
          <Button variant="ghost" size="icon" aria-label="Ganhar Moedas Grátis" title="Ganhar Moedas Grátis" onClick={() => setRewardsOpen(true)}><Gift size={22} /></Button>
        </div>
      </header>

      {tab === "voz" && (
        <>
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <img src={bunny} alt="Coelhinho" width={816} height={816} className="h-36 w-36 object-contain" />
            <h1 className="mt-4 text-4xl font-extrabold">{(SLIDES[slide] ?? SLIDES[0])?.t}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{(SLIDES[slide] ?? SLIDES[0])?.s}</p>
            <div className="mt-4 flex gap-2">
              {SLIDES.map((_, i) => <span key={i} className={`h-2 rounded-full ${i === slide ? "w-8 bg-primary" : "w-2 bg-secondary"}`} />)}
            </div>
          </div>
          <div className="space-y-4 px-5 pb-4">
            <div className="space-y-2">
              <Button variant="secondary" onClick={() => setRewardsOpen(true)} className="w-full gap-2"><Gift size={18} /> Ganhar Moedas Grátis</Button>
              <ShareButton />
            </div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">{me.name} <GenderIndicator gender={me.gender} /></div>
            <div className="relative grid grid-cols-2 gap-3">
              <Pill onClick={() => setMenu(menu === "g" ? null : "g")} label={gender === "Todos" ? "Gênero" : gender} icon="⚥" />
              <Pill onClick={() => setMenu(menu === "m" ? null : "m")} label={mode} icon={mode === "Brasil" ? "🇧🇷" : "🌏"} />
              <Button variant="ghost" size="lg" onClick={() => setMenu(menu === "own" ? null : "own")} className="col-span-2 gap-2 rounded-full bg-card py-4 font-bold">Meu gênero: {genderLabel(me.gender)} <GenderIndicator gender={me.gender} /><ChevronUp size={18} /></Button>
              {menu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-3xl bg-card p-2">
                  {(menu === "own" ? genderOptions.map((o) => o.label) : menu === "g" ? ["Todos", "Mulheres", "Homens"] : ["Mundo", "Brasil"]).map((o) => (
                    <Button variant="ghost" size="lg" key={o} onClick={() => { if (menu === "own") { const option = genderOptions.find((x) => x.label === o); if (option) setMe({ ...me, gender: option.value }); } else if (menu === "g") setGender(o as Gender); else setMode(o as Mode); setMenu(null); }}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-semibold hover:bg-secondary">
                      {menu === "m" && (o === "Brasil" ? "🇧🇷 " : "🌏 ")}{o}{(menu === "own" ? genderLabel(me.gender) : menu === "g" ? gender : mode) === o && <Check size={18} className="text-primary" />}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {error && <p role="alert" className="text-center text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="text-center text-sm text-muted-foreground">{notice}</p>}
            <Button variant="ghost" size="lg" disabled={starting} onClick={start} className="flex h-auto w-full whitespace-normal items-center justify-center gap-3 rounded-full bg-gradient-primary py-4 text-lg font-bold text-primary-foreground">
              <Phone size={22} fill="currentColor" /> {starting ? "Aguardando microfone..." : "Iniciar bate-papo por voz"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">Apenas para maiores de 18 anos. Proibidos gritos, música alta, conteúdo sexual e assédio.</p>
          </div>
        </>
      )}

      {tab === "msg" && (
        <List title="Mensagens" empty="Adicione amigos durante uma chamada para conversar aqui.">
          {friends.map((f) => {
            const last = chats[f.id]?.at(-1)?.text;
            return (
              <Button variant="ghost" size="lg" key={f.id} onClick={() => setOpenChat(f)} className="flex w-full items-center gap-3 rounded-3xl bg-card p-3 text-left">
                <Avatar g={f.gender} />
                <div className="min-w-0"><p className="font-bold">{f.name}</p><p className="truncate text-sm text-muted-foreground">{last || f.country}</p></div>
              </Button>
            );
          })}
        </List>
      )}

      {tab === "hist" && (
        <List title="Histórico" empty="Suas chamadas aparecerão aqui.">
          {history.map((h, i) => (
            <div key={i} className="flex items-center gap-3 rounded-3xl bg-card p-3">
              <Avatar g={h.gender} />
              <div className="flex-1"><p className="font-bold">{h.name}</p><p className="text-sm text-muted-foreground">{h.country} · {new Date(h.date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p></div>
              <span className="text-sm font-semibold text-primary-glow">{fmt(h.secs)}</span>
            </div>
          ))}
        </List>
      )}

      <nav className="grid grid-cols-3 rounded-t-3xl border-t border-border py-3">
        {([["voz", Phone, "Bate-papo por voz"], ["msg", MessageCircle, "Mensagens"], ["hist", History, "Histórico"]] as const).map(([k, Icon, l]) => (
          <Button variant="ghost" size="lg" key={k} onClick={() => setTab(k)} className={`flex flex-col items-center gap-1 text-sm font-semibold ${tab === k ? "text-foreground" : "text-muted-foreground"}`}>
            <Icon size={24} />{l}
          </Button>
        ))}
      </nav>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background text-foreground">{children}</div>;
}
function Pill({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="lg" onClick={onClick} className="flex items-center justify-center gap-2 rounded-full bg-card py-4 text-lg font-bold">
      <span>{icon}</span>{label}<ChevronUp size={18} className="text-muted-foreground" />
    </Button>
  );
}
function Avatar({ g }: { g: string }) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent">
      <img src={g === "F" ? bunny : ghost} alt="" width={816} height={816} loading="lazy" className="h-11 w-11 object-contain" />
    </div>
  );
}
function List({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-6">
      <h1 className="mb-4 text-3xl font-extrabold">{title}</h1>
      {children.length ? <div className="space-y-3">{children}</div> : <p className="mt-16 text-center text-muted-foreground">{empty}</p>}
    </div>
  );
}
function ChatView({ person, msgs, onBack, onSend }: { person: Person; msgs: Msg[]; onBack: () => void; onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <Screen>
      <header className="flex items-center gap-3 border-b border-border p-4">
        <Button variant="ghost" size="lg" onClick={onBack} aria-label="Voltar"><ArrowLeft /></Button>
        <Avatar g={person.gender} /><p className="font-bold">{person.name}</p>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[75%] rounded-3xl px-4 py-2 ${m.from === "eu" ? "ml-auto bg-primary text-primary-foreground" : "bg-card"}`}>{m.text}</div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(text.trim()); setText(""); } }} className="flex gap-2 p-4">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem..."
          className="flex-1 rounded-full bg-card px-5 py-3 outline-none" />
        <Button variant="ghost" size="lg" aria-label="Enviar" className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><Send size={20} /></Button>
      </form>
    </Screen>
  );
}

function GenderIndicator({ gender }: { gender: string }) {
  return <span role="img" aria-label={genderLabel(gender)} className={`inline-block font-bold ${gender === "M" ? "text-gender-male" : gender === "F" ? "text-gender-female" : "text-gender-private"}`}>{genderSymbol(gender)}</span>;
}

function Onboard({ onDone }: { onDone: (m: Omit<Me, "id">, location: Mode) => Promise<void> }) {
  const [name, setName] = useState("");
  const [g, setG] = useState<OwnGender | null>(null);
  const [location, setLocation] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);
  const [entryError, setEntryError] = useState("");
  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <img src={vozoneLogo} alt="Vozone" width={1000} height={280} className="h-8 w-auto object-contain" />
        <img src={bunny} alt="" width={816} height={816} className="h-32 w-32 object-contain" />
        <h1 className="text-3xl font-extrabold">Bem-vindo ao Vozone</h1>

        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder="Seu apelido"
          className="w-full rounded-full bg-card px-5 py-4 text-center text-lg outline-none" />
        <div className="grid w-full grid-cols-2 gap-3">
          {genderOptions.map((x) => (
            <Button variant="ghost" size="lg" key={x.value} onClick={() => setG(x.value)} aria-pressed={g === x.value} className={`gap-2 rounded-full py-4 text-lg font-bold ${x.value === "U" ? "col-span-2" : ""} ${g === x.value ? "bg-primary text-primary-foreground" : "bg-card"}`}>
              <GenderIndicator gender={x.value} />{x.label}
            </Button>
          ))}
        </div>
        <div className="grid w-full grid-cols-2 gap-3" aria-label="Localidade">
          {(["Mundo", "Brasil"] as const).map((value) => <Button key={value} variant={location === value ? "default" : "secondary"} aria-pressed={location === value} onClick={() => setLocation(value)}>{value === "Brasil" ? "🇧🇷" : "🌏"} {value}</Button>)}
        </div>
        {entryError && <p role="alert" className="text-destructive">{entryError}</p>}
      </div>
      <div className="p-5">
        <Button variant="ghost" size="lg" disabled={busy || !name.trim() || !g || !location} onClick={async () => {
          if (!g || !location || !name.trim() || busy) return;
          setBusy(true); setEntryError("");
          try { await onDone({ name: name.trim(), gender: g }, location); }
          catch { setEntryError("Não foi possível entrar. Tente novamente."); }
          finally { setBusy(false); }
        }} className="w-full rounded-full bg-gradient-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-40">{busy ? "Entrando..." : "Entrar"}</Button>
        <p className="mt-3 text-center text-sm text-muted-foreground">Ao entrar você confirma ter 18 anos ou mais.</p>
      </div>
    </Screen>
  );
}
