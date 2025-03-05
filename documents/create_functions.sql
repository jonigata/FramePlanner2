-- charge_functions_migration.sql
-- spryt/feathralからchargeへの移行のための関数定義

-- 1. add_charge_with_history (旧: add_bonus_with_history)
CREATE OR REPLACE FUNCTION public.add_charge_with_history(
    p_user_id uuid, 
    p_customer_id text, 
    p_subscription_plan text, 
    p_charge_amount integer, 
    p_invoice_id text, 
    p_period_start timestamp with time zone, 
    p_period_end timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_inserted_user_id uuid;
BEGIN
  RAISE NOTICE 'Starting add_charge_with_history for user %', p_user_id;

  -- 1. まずはサブスクリプションプラン・customer_id の更新を行う
  RAISE NOTICE 'Updating subscription_plan=% and stripe_customer_id=% for user %', p_subscription_plan, p_customer_id, p_user_id;
  UPDATE wallets
    SET subscription_plan   = p_subscription_plan::subscription_plan,
        stripe_customer_id  = p_customer_id
    WHERE id = p_user_id;

  -- 2. charge_history へINSERT（同一user_id+invoice_idで重複があればスキップ）
  RAISE NOTICE 'Inserting charge_history if not exist (user_id=%, invoice_id=%, amount=%)', p_user_id, p_invoice_id, p_charge_amount;
  INSERT INTO charge_history (
    user_id,
    invoice_id,
    amount,
    period_start,
    period_end
  ) VALUES (
    p_user_id,
    p_invoice_id,
    p_charge_amount,
    p_period_start,
    p_period_end
  )
  ON CONFLICT ON CONSTRAINT charge_user_invoice_uniq
  DO NOTHING
  RETURNING user_id
  INTO v_inserted_user_id;

  -- 3. INSERTが実際に成功した場合のみ、ウォレット残高を加算
  IF v_inserted_user_id IS NOT NULL THEN
    RAISE NOTICE 'Charge history inserted. Now adding % charge to user %', p_charge_amount, p_user_id;

    UPDATE wallets
      SET permanent = permanent + p_charge_amount
      WHERE id = p_user_id;

    RAISE NOTICE 'Wallet updated with charge for user %', p_user_id;
  ELSE
    RAISE NOTICE 'Record for (user_id=%, invoice_id=%) already exists. Skipping charge.', p_user_id, p_invoice_id;
  END IF;

  RAISE NOTICE 'add_charge_with_history completed.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$function$;

-- 2. add_charge_by_subscription_id (旧: add_bonus_with_history_by_subid)
CREATE OR REPLACE FUNCTION public.add_charge_by_subscription_id(
    p_subscription_id text, 
    p_customer_id text, 
    p_subscription_plan text, 
    p_charge_amount integer, 
    p_invoice_id text, 
    p_period_start timestamp with time zone, 
    p_period_end timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_user_id uuid;
  v_inserted_user_id uuid;
BEGIN
  -- 1) subscription_id から user_id を取得
  SELECT id
    INTO v_user_id
    FROM wallets
    WHERE subscription_id = p_subscription_id
    LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No user found for subscription_id=%', p_subscription_id;
    RETURN NULL;
  END IF;

  RAISE NOTICE 'Found user %, proceeding with charge addition...', v_user_id;

  -- 2) ウォレット情報を更新（プラン・カスタマーIDなど）
  UPDATE wallets
    SET subscription_plan  = p_subscription_plan::subscription_plan,
        stripe_customer_id = p_customer_id
    WHERE id = v_user_id;

  -- 3) charge_history にINSERT (同じ invoice_id なら重複しないようにユニーク制約＋ON CONFLICT)
  INSERT INTO charge_history (
    user_id,
    invoice_id,
    amount,
    period_start,
    period_end
  )
  VALUES (
    v_user_id,
    p_invoice_id,
    p_charge_amount,
    p_period_start,
    p_period_end
  )
  ON CONFLICT ON CONSTRAINT charge_user_invoice_uniq
  DO NOTHING
  RETURNING user_id
  INTO v_inserted_user_id;

  -- 4) INSERTが成功 (v_inserted_user_id が値を返した) の時だけウォレット残高を加算
  IF v_inserted_user_id IS NOT NULL THEN
    RAISE NOTICE 'Inserted charge_history. Now adding % charge to user %', p_charge_amount, v_user_id;

    UPDATE wallets
      SET permanent = permanent + p_charge_amount
      WHERE id = v_user_id;

    RAISE NOTICE 'Wallet updated for user %', v_user_id;
  ELSE
    RAISE NOTICE 'Record for (user_id=%, invoice_id=%) already exists; skipping charge.', v_user_id, p_invoice_id;
  END IF;

  RETURN v_user_id;
END;
$function$;

-- 3. cancel_charge_reservation (旧: cancel_feathral)
CREATE OR REPLACE FUNCTION public.cancel_charge_reservation(p_user_id uuid, p_usage_id uuid)
RETURNS void
LANGUAGE sql
AS $function$
  DELETE FROM charge_usage WHERE id = p_usage_id AND user_id = p_user_id;
$function$;

-- 4. claim_daily_charge (旧: claim_daily_bonus)
CREATE OR REPLACE FUNCTION public.claim_daily_charge()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  last_claim timestamp with time zone;
  current_jst timestamp with time zone;
  reset_time timestamp with time zone;
BEGIN
  current_jst := (current_timestamp at time zone 'UTC') at time zone 'Asia/Tokyo';
  reset_time := date_trunc('day', current_jst) + interval '4 hours';
  IF current_jst < reset_time THEN
    reset_time := reset_time - interval '1 day';
  END IF;

  SELECT last_daily_charge_at
  INTO last_claim
  FROM wallets
  WHERE id = auth.uid();

  IF last_claim IS NULL OR last_claim < reset_time THEN
    UPDATE wallets
    SET
      temporary = 100,
      last_daily_charge_at = current_jst
    WHERE id = auth.uid();
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- 5. claim_daily_charge (旧: claim_daily_bonus) - オーバーロードバージョン
CREATE OR REPLACE FUNCTION public.claim_daily_charge(p_wallet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  last_claim timestamp with time zone;
  current_jst timestamp with time zone;
  reset_time timestamp with time zone;
BEGIN
  current_jst := (current_timestamp at time zone 'UTC') at time zone 'Asia/Tokyo';
  reset_time := date_trunc('day', current_jst) + interval '4 hours';
  IF current_jst < reset_time THEN
    reset_time := reset_time - interval '1 day';
  END IF;

  SELECT last_daily_charge_at
  INTO last_claim
  FROM wallets
  WHERE id = p_wallet_id;

  IF last_claim IS NULL OR last_claim < reset_time THEN
    UPDATE wallets
    SET
      temporary = 100,
      last_daily_charge_at = current_jst
    WHERE id = p_wallet_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- 6. cleanup_charge_usage (旧: cleanup_feathral_usage)
CREATE OR REPLACE FUNCTION public.cleanup_charge_usage(p_threshold_ms bigint)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  cutoff TIMESTAMP WITH TIME ZONE := NOW() - (p_threshold_ms || ' milliseconds')::interval;
BEGIN
  DELETE FROM charge_usage WHERE created_at < cutoff;
END;
$function$;

-- 7. consume_charge (旧: finalize_feathral)
CREATE OR REPLACE FUNCTION public.consume_charge(p_user_id uuid, p_usage_id uuid)
RETURNS bigint
LANGUAGE plpgsql
AS $function$
DECLARE
  now TIMESTAMP WITH TIME ZONE := NOW();
  wallet_record RECORD;
  usage_record RECORD;
  total_used BIGINT;
  available BIGINT;
  w BIGINT;
  leftover BIGINT;
BEGIN
  SELECT * FROM charge_usage WHERE id = p_usage_id AND user_id = p_user_id INTO usage_record;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usage record not found';
  END IF;
  w := usage_record.amount;

  SELECT * FROM wallets WHERE id = p_user_id FOR UPDATE INTO wallet_record;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO total_used FROM charge_usage WHERE user_id = p_user_id;
  available := wallet_record.permanent + wallet_record.temporary - total_used;

  IF available < 0 THEN
    RAISE EXCEPTION 'Not enough charge at finalize time';
  END IF;

  -- 消費
  IF wallet_record.temporary >= w THEN
    wallet_record.temporary := wallet_record.temporary - w;
  ELSE
    w := w - wallet_record.temporary;
    wallet_record.temporary := 0;
    wallet_record.permanent := wallet_record.permanent - w;
    IF wallet_record.permanent < 0 THEN
      RAISE EXCEPTION 'Not enough after calculation';
    END IF;
  END IF;

  UPDATE wallets
     SET permanent = wallet_record.permanent,
         temporary = wallet_record.temporary
   WHERE id = p_user_id;

  DELETE FROM charge_usage WHERE id = p_usage_id;

  leftover := wallet_record.permanent + wallet_record.temporary;
  RETURN leftover;
END;
$function$;

-- 8. handle_user_created (旧: handle_new_user)
-- 注: このトリガー関数はcharge_tables_migration.sqlで既に定義されています

-- 9. add_charge (旧: increment_spryt_balance)
CREATE OR REPLACE FUNCTION public.add_charge(p_user_id uuid, p_charge_amount integer)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE wallets
  SET permanent = COALESCE(permanent, 0) + p_charge_amount
  WHERE id = p_user_id
  RETURNING permanent INTO v_new_balance;
  
  RETURN v_new_balance;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update charge balance: %', SQLERRM;
END;
$function$;

-- 10. reserve_charge (旧: reserve_feathral)
CREATE OR REPLACE FUNCTION public.reserve_charge(p_user_id uuid, p_amount bigint, p_charge_per_day bigint)
RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  now TIMESTAMP WITH TIME ZONE := NOW();
  wallet_record RECORD;
  total_used BIGINT;
  available BIGINT;
  usage_id UUID;
  jst_today_start TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT * FROM wallets WHERE id = p_user_id FOR UPDATE INTO wallet_record;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  SELECT date_trunc('day', now AT TIME ZONE 'Asia/Tokyo') INTO jst_today_start;
  IF wallet_record.last_daily_charge_at IS NULL OR wallet_record.last_daily_charge_at < (jst_today_start AT TIME ZONE 'UTC') THEN
    wallet_record.temporary := p_charge_per_day;
    wallet_record.last_daily_charge_at := now;
    UPDATE wallets
       SET temporary = wallet_record.temporary,
           last_daily_charge_at = wallet_record.last_daily_charge_at
     WHERE id = p_user_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO total_used FROM charge_usage WHERE user_id = p_user_id;

  available := wallet_record.permanent + wallet_record.temporary - total_used;
  IF available < p_amount THEN
    RAISE EXCEPTION 'Not enough charge';
  END IF;

  INSERT INTO charge_usage(user_id, amount, created_at)
    VALUES (p_user_id, p_amount, now)
    RETURNING id INTO usage_id;

  RETURN usage_id;
END;
$function$;

-- 11. handle_subscription_deleted (旧: handle_subscription_deleted)
CREATE OR REPLACE FUNCTION public.handle_subscription_deleted(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
  -- トランザクション内で複数の更新を行う
  -- サブスクリプションプランを'free'に更新し、ダウングレード予定情報もリセット
  UPDATE wallets
  SET
    subscription_plan = 'free',
    pending_downgrade = false,
    downgrade_scheduled_at = NULL
  WHERE id = p_user_id;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to handle subscription deletion: %', SQLERRM;
END;
$function$;

-- 12. handle_subscription_updated (旧: handle_subscription_updated)
CREATE OR REPLACE FUNCTION public.handle_subscription_updated(p_user_id uuid, p_cancel_at_period_end boolean, p_current_period_end bigint DEFAULT NULL::bigint)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
BEGIN
  IF p_cancel_at_period_end THEN
    -- ダウングレード予定を記録
    UPDATE wallets
    SET
      pending_downgrade = true,
      downgrade_scheduled_at =
        CASE
          WHEN p_current_period_end IS NOT NULL THEN
            p_current_period_end
          ELSE
            NULL
        END
    WHERE id = p_user_id;
  ELSE
    -- キャンセル予定が解除された場合
    UPDATE wallets
    SET
      pending_downgrade = false,
      downgrade_scheduled_at = NULL
    WHERE id = p_user_id;
  END IF;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to handle subscription update: %', SQLERRM;
END;
$function$;

-- 13. update_subscription_plan (旧: update_subscription_plan)
CREATE OR REPLACE FUNCTION public.update_subscription_plan(p_user_id uuid, p_subscription_plan text)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- サブスクリプションプランのみを更新（stripe_customer_idは変更しない）
  UPDATE wallets
  SET subscription_plan = p_subscription_plan::subscription_plan  -- テキストをenum型にキャスト
  WHERE id = p_user_id;
END;
$function$;

-- 14. update_subscription_with_charge (旧: update_subscription_with_bonus)
CREATE OR REPLACE FUNCTION public.update_subscription_with_charge(p_user_id uuid, p_customer_id text, p_subscription_plan text, p_charge_amount integer, p_new_balance integer)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- サブスクリプションプランとStripe顧客IDを更新し、Chargeを付与
  UPDATE wallets
  SET
    subscription_plan = p_subscription_plan::subscription_plan,
    stripe_customer_id = p_customer_id,
    permanent = p_new_balance
  WHERE id = p_user_id;
END;
$function$;