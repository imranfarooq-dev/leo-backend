DO $$ 
DECLARE 
    subscription_id text := 'beta_1';  -- This will disable all beta testers with this subscription ID
    affected_count integer;
BEGIN
    WITH expired_beta_testers AS (
        SELECT user_id 
        FROM subscriptions
        WHERE 
            status = 'active' 
            AND stripe_subscription_id = subscription_id -- Identifies beta testers
    ),
    update_subscriptions AS (
        UPDATE subscriptions
        SET 
            status = NULL,
            free_plan_status = 'subscribed'::plan_status,
            price = NULL,
            stripe_price_id = NULL,
            current_period_start = NULL,
            current_period_end = NULL,
            stripe_subscription_id = NULL
        FROM expired_beta_testers
        WHERE subscriptions.user_id = expired_beta_testers.user_id
        RETURNING subscriptions.user_id
    )
    UPDATE credits c
    SET 
        monthly_credits = 0,
        image_limits = 100
    FROM update_subscriptions u
    WHERE c.user_id = u.user_id
    RETURNING (SELECT COUNT(*) FROM update_subscriptions) INTO affected_count;

    RAISE NOTICE 'Beta testing period ended for % user(s)', affected_count;
END $$;