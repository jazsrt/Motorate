/*
  # Fix post_comments INSERT policy
  
  The existing policy is too restrictive with privacy checks.
  This simplifies to just verify the user owns the comment.
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can comment on visible posts" ON public.post_comments;
DROP POLICY IF EXISTS "Users can insert comments" ON public.post_comments;

-- Create simpler insert policy
CREATE POLICY "Users can insert comments"
  ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Also add update policy if missing
DROP POLICY IF EXISTS "Users can update own comments" ON public.post_comments;

CREATE POLICY "Users can update own comments"
  ON public.post_comments FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
