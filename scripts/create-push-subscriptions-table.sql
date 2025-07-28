-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) UNIQUE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_email ON push_subscriptions(user_email);

-- Create index on active status
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active);
