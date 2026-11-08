ALTER TABLE public.voice_wallets ADD COLUMN checkin_day integer NOT NULL DEFAULT 0, ADD COLUMN last_checkin_date date;
CREATE TABLE public.wallet_rewards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wallet_id uuid NOT NULL REFERENCES public.voice_wallets(id) ON DELETE CASCADE,
 source text NOT NULL,
 reference text NOT NULL,
 coins integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wallet_id, source, reference)
);
GRANT ALL ON public.wallet_rewards TO service_role;
ALTER TABLE public.wallet_rewards ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.checkin_reward(p_day integer) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT CASE WHEN p_day = 30 THEN 30 WHEN p_day BETWEEN 1 AND 29 THEN 1 ELSE 0 END $$;
CREATE FUNCTION public.rewarded_video_coins(p_seconds integer) RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT CASE WHEN p_seconds <= 0 THEN 0 WHEN p_seconds < 60 THEN 1 WHEN p_seconds < 300 THEN 3 ELSE 5 END $$;
REVOKE ALL ON FUNCTION public.checkin_reward(integer), public.rewarded_video_coins(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.checkin_reward(integer), public.rewarded_video_coins(integer) TO service_role;
CREATE FUNCTION public.claim_daily_checkin(p_token_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.voice_wallets; today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; next_day integer; reward integer;
BEGIN
 SELECT * INTO w FROM public.voice_wallets WHERE token_hash = p_token_hash FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;
 IF w.last_checkin_date = today THEN
  RETURN jsonb_build_object('claimed', false, 'day', w.checkin_day, 'reward', 0, 'promo', w.promo_coins, 'paid', w.paid_coins, 'today', today);
 END IF;
 next_day := CASE WHEN w.last_checkin_date = today - 1 AND w.checkin_day BETWEEN 1 AND 29 THEN w.checkin_day + 1 ELSE 1 END;
 reward := public.checkin_reward(next_day);
 INSERT INTO public.wallet_rewards(wallet_id, source, reference, coins) VALUES(w.id, 'checkin', today::text, reward);
 UPDATE public.voice_wallets SET promo_coins = promo_coins + reward, checkin_day = next_day, last_checkin_date = today WHERE id = w.id RETURNING * INTO w;
 RETURN jsonb_build_object('claimed', true, 'day', next_day, 'reward', reward, 'promo', w.promo_coins, 'paid', w.paid_coins, 'today', today);
END $$;
REVOKE ALL ON FUNCTION public.claim_daily_checkin(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_checkin(text) TO service_role;