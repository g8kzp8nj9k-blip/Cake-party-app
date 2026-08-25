-- Create tables for Cake Party App

-- Questionnaires table
CREATE TABLE questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  responses JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id)
);

-- Cakes table
CREATE TABLE cakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  cake_photo_url TEXT NOT NULL,
  decor_photo_url TEXT,
  ai_suggestions JSONB,
  has_ai_suggestions BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_questionnaires_user_id ON questionnaires(user_id);
CREATE INDEX idx_questionnaires_created_at ON questionnaires(created_at DESC);
CREATE INDEX idx_cakes_user_id ON cakes(user_id);
CREATE INDEX idx_cakes_created_at ON cakes(created_at DESC);
