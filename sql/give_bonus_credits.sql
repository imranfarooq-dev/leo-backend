DO $$ 
DECLARE 
    selected_emails varchar[] := ARRAY[
        'jack@tryleo.ai'
    ];
    bonus_credits integer := 100;
BEGIN
    WITH user_emails AS (
        SELECT id as user_id 
        FROM users 
        WHERE email_address = ANY(selected_emails)
    )
    UPDATE credits 
    SET lifetime_credits = credits.lifetime_credits + bonus_credits
    FROM user_emails
    WHERE credits.user_id = user_emails.user_id;
END $$;