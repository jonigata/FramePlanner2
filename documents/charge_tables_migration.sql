-- charge_tables_migration.sql
-- spryt/feathralからchargeへの移行のためのテーブルとビュー定義

-- 1. 新しいテーブルの作成

-- charge_wallets テーブル (wallets の代替)
CREATE TABLE IF NOT EXISTS public.charge_wallets (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_daily_charge_at TIMESTAMP WITH TIME ZONE,
    temporary BIGINT NOT NULL DEFAULT 0,  -- 旧resilient
    permanent BIGINT NOT NULL DEFAULT 0,  -- 旧permanent
    subscription_plan subscription_plan NOT NULL DEFAULT 'free'::subscription_plan,
    stripe_customer_id TEXT,
    downgrade_scheduled_at BIGINT,
    pending_downgrade BOOLEAN DEFAULT false,
    subscription_id TEXT
);

-- charge_usage テーブル (feathral_usage の代替)
CREATE TABLE IF NOT EXISTS public.charge_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID NOT NULL REFERENCES charge_wallets(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL DEFAULT 0  -- 旧withdraw
);

-- charge_history テーブル (bonus_history の代替)
CREATE TABLE IF NOT EXISTS public.charge_history (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES charge_wallets(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT charge_user_invoice_uniq UNIQUE (user_id, invoice_id)
);

-- 2. ビューの作成

-- charge_total ビュー (wallet_total_points の代替)
CREATE OR REPLACE VIEW public.charge_total AS
SELECT 
    cw.id,
    (cw.permanent + cw.temporary) AS total_charges,
    cw.subscription_plan
FROM 
    charge_wallets cw;

-- 3. 既存データの移行

-- wallets から charge_wallets へのデータ移行
INSERT INTO charge_wallets (
    id, 
    created_at, 
    last_daily_charge_at, 
    temporary, 
    permanent, 
    subscription_plan, 
    stripe_customer_id, 
    downgrade_scheduled_at, 
    pending_downgrade, 
    subscription_id
)
SELECT 
    id, 
    created_at, 
    last_daily_bonus_at, 
    resilient, 
    permanent, 
    subscription_plan, 
    stripe_customer_id, 
    downgrade_scheduled_at, 
    pending_downgrade, 
    subscription_id
FROM 
    wallets
ON CONFLICT (id) DO NOTHING;

-- feathral_usage から charge_usage へのデータ移行
INSERT INTO charge_usage (
    id,
    created_at,
    user_id,
    amount
)
SELECT 
    id,
    created_at,
    user_id,
    withdraw
FROM 
    feathral_usage
ON CONFLICT (id) DO NOTHING;

-- bonus_history から charge_history へのデータ移行
INSERT INTO charge_history (
    id,
    user_id,
    invoice_id,
    amount,
    period_start,
    period_end,
    created_at
)
SELECT 
    id,
    user_id,
    invoice_id,
    amount,
    period_start,
    period_end,
    created_at
FROM 
    bonus_history
ON CONFLICT (user_id, invoice_id) DO NOTHING;

-- 4. RLS (Row Level Security) ポリシーの設定

-- charge_wallets テーブルのRLSポリシー
ALTER TABLE public.charge_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは自分のウォレットのみ閲覧可能" 
    ON public.charge_wallets FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "管理者はすべてのウォレットを閲覧可能" 
    ON public.charge_wallets FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- charge_usage テーブルのRLSポリシー
ALTER TABLE public.charge_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは自分の使用履歴のみ閲覧可能" 
    ON public.charge_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "管理者はすべての使用履歴を閲覧可能" 
    ON public.charge_usage FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- charge_history テーブルのRLSポリシー
ALTER TABLE public.charge_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは自分の履歴のみ閲覧可能" 
    ON public.charge_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "管理者はすべての履歴を閲覧可能" 
    ON public.charge_history FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 5. インデックスの作成

-- charge_usage テーブルのインデックス
CREATE INDEX IF NOT EXISTS charge_usage_user_id_idx ON public.charge_usage (user_id);
CREATE INDEX IF NOT EXISTS charge_usage_created_at_idx ON public.charge_usage (created_at);

-- charge_history テーブルのインデックス
CREATE INDEX IF NOT EXISTS charge_history_user_id_idx ON public.charge_history (user_id);
CREATE INDEX IF NOT EXISTS charge_history_invoice_id_idx ON public.charge_history (invoice_id);
CREATE INDEX IF NOT EXISTS charge_history_created_at_idx ON public.charge_history (created_at);

-- 6. トリガーの設定

-- 新規ユーザー作成時にcharge_walletsレコードを自動作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_user_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.charge_wallets (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 既存のトリガーを削除（もし存在する場合）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 新しいトリガーを作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_created();

-- 注意: 古いテーブルは、すべての移行が完了し検証された後に削除することをお勧めします
-- DROP TABLE IF EXISTS public.wallets CASCADE;
-- DROP TABLE IF EXISTS public.feathral_usage CASCADE;
-- DROP TABLE IF EXISTS public.bonus_history CASCADE;