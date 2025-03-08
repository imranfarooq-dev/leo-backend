DO $$ 
DECLARE 
    beta_tester_emails varchar[] := ARRAY[
        'jack@tryleo.ai'
    ];
    existing_paid_subscribers integer;
    missing_users text[];
    found_users integer;
	subscription_id text := 'beta_1';  -- Must begin with 'beta_' for the Stripe webhook spoofing
BEGIN
    -- First check if all emails exist
    WITH email_check AS (
        SELECT 
            e.email_address,
            CASE WHEN u.id IS NULL THEN e.email_address END as missing
        FROM unnest(beta_tester_emails) AS e(email_address)
        LEFT JOIN users u ON u.email_address = e.email_address
    )
    SELECT 
        array_agg(missing) INTO missing_users
    FROM email_check
    WHERE missing IS NOT NULL;

    -- Abort if any emails weren't found
    IF missing_users IS NOT NULL THEN
        RAISE EXCEPTION 'Operation aborted: The following email(s) were not found in the users table: %', missing_users;
    END IF;

    -- Check if any of these users have active paid subscriptions
    SELECT COUNT(*) INTO existing_paid_subscribers
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    WHERE 
        u.email_address = ANY(beta_tester_emails)
        AND (
            -- Check for any active paid subscription indicators
            (s.status = 'active' AND s.stripe_subscription_id IS NOT NULL AND s.stripe_subscription_id != subscription_id)
            OR s.price IS NOT NULL
        );

    -- Abort if we found any paid subscribers
    IF existing_paid_subscribers > 0 THEN
        RAISE EXCEPTION 'Operation aborted: % user(s) already has/have paid subscriptions. Please remove them from the beta tester list.', existing_paid_subscribers;
    END IF;

    -- Update or insert credits
    INSERT INTO credits (user_id, lifetime_credits, monthly_credits, image_limits)
    SELECT 
        u.id as user_id,
        1000,  -- 1000 lifetime credits
        100,  -- monthly credits
        10000 -- image limits
    FROM users u
    WHERE u.email_address = ANY(beta_tester_emails)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
		lifetime_credits = credits.lifetime_credits + 1000,
		monthly_credits = 100,
		image_limits = 10000
	;

    -- Set up 6-month trial subscription
    UPDATE subscriptions 
    SET 
        status = 'active'::subscription_status,
        current_period_start = CURRENT_TIMESTAMP,
        current_period_end = CURRENT_TIMESTAMP + INTERVAL '1 month',
        free_plan_status = 'previously_subscribed'::plan_status,
        price = NULL,
        -- stripe_price_id = 'price_1QigrsKpx8LALDnHhkjcUJa1', -- Prod
        stripe_price_id = 'price_1Qcr8oKpx8LALDnHxWZcKnT3', -- Dev 
        stripe_subscription_id = subscription_id
    FROM users u
    WHERE 
        subscriptions.user_id = u.id
        AND u.email_address = ANY(beta_tester_emails);

    -- Get count of affected users
    GET DIAGNOSTICS found_users = ROW_COUNT;
    
    -- Log how many users were affected
    RAISE NOTICE 'Successfully set up beta testing package for % user(s)', found_users;
END $$;