-- Migration: Add reactions table for emoji reaction system
-- Description: Creates a reactions table to store user reactions (fire, heart, dead, applause) on posts
-- Author: Claude
-- Date: 2025-12-21

-- Create reactions table
CREATE TABLE IF NOT EXISTS public.reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('fire', 'heart', 'dead', 'applause')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint to ensure one reaction per user per post
ALTER TABLE public.reactions 
ADD CONSTRAINT unique_user_reaction_per_post UNIQUE (post_id, user_id);

-- Create indexes for performance
CREATE INDEX idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX idx_reactions_user_id ON public.reactions(user_id);
CREATE INDEX idx_reactions_created_at ON public.reactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to SELECT any reactions
CREATE POLICY "Users can view all reactions"
ON public.reactions
FOR SELECT
TO authenticated
USING (true);

-- RLS Policy: Allow authenticated users to INSERT their own reactions
CREATE POLICY "Users can insert their own reactions"
ON public.reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Allow authenticated users to UPDATE their own reactions
CREATE POLICY "Users can update their own reactions"
ON public.reactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Allow authenticated users to DELETE their own reactions
CREATE POLICY "Users can delete their own reactions"
ON public.reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add helpful comment to table
COMMENT ON TABLE public.reactions IS 'Stores emoji reactions (fire, heart, dead, applause) from users on posts';
COMMENT ON COLUMN public.reactions.reaction_type IS 'Type of reaction: fire, heart, dead, or applause';
COMMENT ON CONSTRAINT unique_user_reaction_per_post ON public.reactions IS 'Ensures each user can only have one reaction per post';
