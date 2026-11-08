<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep browser voice transport in `src/lib/voice.ts` with acknowledged matchmaking, repeated room readiness, queued ICE, and bounded cleanup; subscriptions can start in either order.
- Require a live microphone before searching and count call duration only while media is connected; a matched peer is not proof of working audio.
- TURN relay credentials must be short-lived and supplied by a verified server integration, never a static public client secret; STUN-only connections cannot cover every network.
- Relay (TURN) credentials come from a server function using Cloudflare Realtime TURN secrets; the client caches them under an hour and falls back to STUN, so the token never reaches the browser.
- Guest entries use server-issued secret capabilities, hashed at rest; reports require reciprocal room membership and atomically suspend only that entry. Warning broadcasts are hints verified on the server, with polling as fallback, so clients cannot forge a suspension notification.
- Matching requires mutual gender and region compatibility via compatible() in voice.ts; Brasil pairs only with Brasil so both sides' choices hold.
- Optional ad scripts and conversion events are gated by explicit stored consent in src/lib/consent.ts; denied defaults apply worldwide because the app requires first-visit privacy choices in every region.
- Built-in payments are test-only until go-live and confirmed payment-method availability; checkout must not substitute an unavailable required payment method, and coin fulfillment must be atomic, verified and environment-scoped.
- Coin wallets are server-side rows keyed by a hashed browser wallet token kept separately from the per-entry identity, so balances survive re-entry while the browser never holds trusted balance data.
- Pix coin purchases go through Asaas from server functions; the webhook checks a shared token header, re-reads the payment from Asaas, then credits via the atomic credit_coin_order RPC, because webhook bodies and browser state are never payment proof.
- Check-in uses a wallet-locked database RPC and unique daily reward ledger; calendar days use America/Sao_Paulo to prevent duplicate and concurrent credits.
- Rewarded videos remain unavailable without an eligible provider supplying authenticated completion and trusted duration; browser playback events never authorize coin rewards.
- Guest profile is a session dialog backed by the existing capability wallet, not a permanent account; native sharing uses the production URL with clipboard fallback.
