-- Add pro_expires_at column to profiles table
-- This column stores the expiration date for Pro plans purchased via one-time payment (BLIK)
-- NULL value means either Free plan or Pro subscription without expiration (Card payments)

ALTER TABLE profiles 
ADD COLUMN pro_expires_at TIMESTAMPTZ NULL;

-- Create index for efficient queries when checking expired plans
CREATE INDEX idx_profiles_pro_expires_at 
ON profiles(pro_expires_at) 
WHERE pro_expires_at IS NOT NULL;

-- Add column comment for documentation
COMMENT ON COLUMN profiles.pro_expires_at IS 
'Pro plan expiration date for one-time payments. NULL = Free plan or Pro subscription without expiration (recurring payments).';

