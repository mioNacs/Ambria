-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('contributor', 'maintainer', 'both')),
  detected_access TEXT NOT NULL CHECK (detected_access IN ('read', 'write', 'admin')),
  repo_stars INTEGER DEFAULT 0,
  repo_language TEXT,
  repo_description TEXT,
  
  -- Canvas and Metadata JSONB columns
  contributor_canvas JSONB NOT NULL DEFAULT '[]'::jsonb,
  maintainer_canvas JSONB NOT NULL DEFAULT '[]'::jsonb,
  repo_pins JSONB NOT NULL DEFAULT '[]'::jsonb,
  repo_findings JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique workspace per repo per user
  UNIQUE(user_id, repo_owner, repo_name)
);

-- 2. Create Threads Table
CREATE TABLE IF NOT EXISTS public.workspace_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tambo_thread_id TEXT NOT NULL UNIQUE,
  title TEXT,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_threads ENABLE ROW LEVEL SECURITY;

-- 4. Create Access Policies

-- Policy: Users can only see/edit their OWN workspaces
-- We drop existing policy first to allow re-running this script without conflict
DROP POLICY IF EXISTS "Users own their workspaces" ON public.workspaces;
CREATE POLICY "Users own their workspaces" ON public.workspaces
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can only see/edit threads in their OWN workspaces
DROP POLICY IF EXISTS "Users access their threads" ON public.workspace_threads;
CREATE POLICY "Users access their threads" ON public.workspace_threads
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
  );

-- 5. Indexes (Optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_threads_workspace_id ON public.workspace_threads(workspace_id);
