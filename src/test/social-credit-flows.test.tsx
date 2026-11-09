import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";

const flow = vi.hoisted(() => ({
  spend: vi.fn(), match: null as null | ((room: string, peer: unknown, caller: boolean) => void),
  remoteEnd: null as null | (() => void), inbox: null as null | ((peer: unknown, text: string) => void),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/wallet.functions", () => ({
  openWallet: async () => ({ token: "a".repeat(64), promo: 100, paid: 0, welcome: true }),
  spendSearchCoin: (input: unknown) => flow.spend(input),
}));
vi.mock("@/lib/voice-entry.functions", () => ({
  createVoiceEntry: async () => ({ id: "me", token: "secret" }),
  checkVoiceEntry: async () => ({ state: "active" }), registerVoiceRoom: async () => ({ ok: true }),
}));
vi.mock("@/lib/reports.functions", () => ({ submitReport: vi.fn() }));
vi.mock("@/lib/voice", () => ({
  search: (_me: unknown, _gender: unknown, _country: unknown, onMatch: typeof flow.match) => { flow.match = onMatch; return vi.fn(); },
  loadRelay: vi.fn(), connectCall: (_room: unknown, _caller: unknown, _stream: unknown, _audio: unknown, onEnd: typeof flow.remoteEnd) => { flow.remoteEnd = onEnd; return vi.fn(); },
  listenInbox: (_id: unknown, callback: typeof flow.inbox) => { flow.inbox = callback; return vi.fn(); },
  sendDM: vi.fn(), listenWarning: () => vi.fn(), notifyWarning: vi.fn(),
}));
vi.mock("@/lib/consent", () => ({ trackVoiceSearch: vi.fn() }));
vi.mock("@/components/rewards-dialog", () => ({ RewardsDialog: () => null, ShareButton: () => null }));
vi.mock("@/components/buy-coins-dialog", () => ({ BuyCoinsDialog: () => null }));
import { Route } from "@/routes/index";
const App = Route.options.component as ComponentType;
const peer = { id: "peer", name: "Ana", gender: "F", country: "🌏 Mundo" };

async function enter() {
  render(<App />);
  fireEvent.change(await screen.findByPlaceholderText("Seu apelido"), { target: { value: "Teste" } });
  fireEvent.click(screen.getByRole("button", { name: "Homem", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: /Mundo/ }));
  fireEvent.click(screen.getByRole("button", { name: "Entrar", exact: true }));
  await screen.findByRole("button", { name: "Saldo de moedas" });
}
async function filter(gender: string) {
  fireEvent.click(screen.getByRole("button", { name: /Gênero/ }));
  fireEvent.click(screen.getByRole("button", { name: gender, exact: true }));
}
async function startCall() {
  fireEvent.click(screen.getByRole("button", { name: "Iniciar bate-papo por voz" }));
  await waitFor(() => expect(flow.match).toBeTypeOf("function"));
  await act(async () => { flow.match?.("room", peer, true); });
  await screen.findByRole("button", { name: "Próximo" });
}
describe("preserved social and search flows", () => {
  beforeEach(() => {
    localStorage.clear(); flow.spend.mockReset(); flow.spend.mockResolvedValue({ ok: true, promo: 99, paid: 0 });
    flow.match = null; flow.remoteEnd = null; flow.inbox = null;
    const track = { readyState: "live", enabled: true, stop: vi.fn() };
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track], getAudioTracks: () => [track] }) } });
  });
  afterEach(cleanup);
  it("Todos costs zero credits", async () => {
    await enter(); await startCall(); expect(flow.spend).not.toHaveBeenCalled();
  });
  it.each(["Mulheres", "Homens"])("an explicit %s search debits once", async (gender) => {
    await enter(); await filter(gender); await startCall();
    expect(flow.spend).toHaveBeenCalledTimes(1);
    expect(flow.spend).toHaveBeenCalledWith({ data: { token: "a".repeat(64), gender } });
  });
  it("a remote skip requeues without another debit", async () => {
    await enter(); await filter("Mulheres"); await startCall();
    await act(async () => { flow.remoteEnd?.(); });
    await screen.findByRole("button", { name: "Cancelar pesquisa" });
    expect(flow.spend).toHaveBeenCalledTimes(1);
  });
  it("clicking Próximo debits exactly once for the new filtered search", async () => {
    await enter(); await filter("Mulheres"); await startCall();
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await screen.findByRole("button", { name: "Cancelar pesquisa" });
    expect(flow.spend).toHaveBeenCalledTimes(2);
  });
  it("adds a call contact and reads their notification", async () => {
    await enter(); await startCall();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar Amigo", exact: true }));
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar Ana" }));
    expect(JSON.parse(localStorage.getItem("vz_friends") ?? "[]")[0].name).toBe("Ana");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Desligar" }));
    await act(async () => { flow.inbox?.(peer, "Olá Teste"); });
    fireEvent.click(screen.getByRole("button", { name: "Notificações" }));
    fireEvent.click(await screen.findByRole("button", { name: /Ana.*Olá Teste/ }));
    await screen.findByPlaceholderText("Escreva uma mensagem...");
    await waitFor(() => expect(JSON.parse(localStorage.getItem("vz_read") ?? "{}").peer).toBe(1));
  });
});