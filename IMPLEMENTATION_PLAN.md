# Open Source Hub - 3-Day Implementation Plan

## 🎯 Priority Matrix

### Must Have (MVP)
- ✅ GitHub OAuth login
- ✅ Workspace creation with permission detection
- ✅ Role selection based on access
- ✅ Workspace-scoped threads
- ✅ 3-4 generative components (IssueCard, TriageCard, PRCard)
- ✅ 1 interactable (TriageQueue)
- ✅ Basic contributor flow (find issues)
- ✅ Basic maintainer flow (triage queue)

### Should Have
- ⚡ "Both" mode with combined UI
- ⚡ CodeExplorer component
- ⚡ CommunityHealth component
- ⚡ Thread history sidebar

### Cut / Post-Hackathon
- ❌ ContributionGuide step tracking
- ❌ Duplicate detection
- ❌ Response templates
- ❌ Advanced filtering
- ❌ Mobile responsive polish

---

## 📊 Condensed Database Schema

```sql
-- Minimal schema for MVP
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('contributor', 'maintainer', 'both')),
  detected_access TEXT NOT NULL CHECK (detected_access IN ('read', 'write', 'admin')),
  repo_stars INTEGER DEFAULT 0,
  repo_language TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, repo_owner, repo_name)
);

CREATE TABLE public.workspace_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tambo_thread_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their workspaces" ON public.workspaces
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users access their threads" ON public.workspace_threads
  FOR ALL USING (workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = auth.uid()));
```

---

## 🗓️ 3-Day Timeline

### Day 1: Foundation + Auth + Workspaces (10-12 hours)

#### Block 1: Supabase Setup (2 hours)
- [ ] Create Supabase project
- [ ] Run database schema
- [ ] Enable GitHub OAuth provider
- [ ] Configure callback URL
- [ ] Get environment variables

#### Block 2: Auth Flow (2 hours)
- [ ] Install Supabase packages
- [ ] Create Supabase client utilities
- [ ] Build login page with GitHub button
- [ ] Create auth callback route
- [ ] Create auth middleware
- [ ] Test: Login → Dashboard flow

#### Block 3: Workspace Management (3 hours)
- [ ] `useWorkspaces` hook (CRUD)
- [ ] `useGitHubToken` hook
- [ ] GitHub permission check API route
- [ ] AddWorkspaceModal component
  - URL input
  - Permission checking
  - Role selection
- [ ] WorkspaceList on dashboard
- [ ] Test: Create workspace with real repo

#### Block 4: Workspace Chat Page (3 hours)
- [ ] Workspace page with TamboProvider
- [ ] Thread creation on first message
- [ ] Store thread mapping in Supabase
- [ ] Inject workspace context into Tambo
- [ ] Basic workspace header (repo name + role badge)
- [ ] Test: Send message in workspace

#### Day 1 Deliverable
✅ User can login, create workspaces, and chat

---

### Day 2: Core Features - Contributor + Maintainer (10-12 hours)

#### Block 1: Contributor Components (3 hours)
- [ ] IssueCard component
  - Title, labels, author, date
  - Clean styling
- [ ] IssueList component
  - Grid of IssueCards
  - Count display
- [ ] Register components in Tambo

#### Block 2: Contributor Tools (2 hours)
- [ ] `findGoodFirstIssues` tool
  - Search issues with "good first issue" label
  - Use workspace's repo
  - Return formatted for IssueList
- [ ] `getIssueDetails` tool
  - Full issue body
  - Comments count
- [ ] Test: "Find good first issues" works

#### Block 3: Maintainer Components (3 hours)
- [ ] TriageCard component
  - AI summary placeholder
  - First-time contributor badge
  - Suggested labels
- [ ] PRReviewCard component
  - Files changed, +/-
  - CI status indicators
- [ ] Register components

#### Block 4: Maintainer Tools (2 hours)
- [ ] `getTriageQueue` tool
  - Fetch unlabeled/new issues
  - Basic categorization
- [ ] `getPRQueue` tool
  - Fetch open PRs
  - Include checks status
- [ ] Test: "Show triage queue" works

#### Block 5: Role-Based Registration (2 hours)
- [ ] Dynamic tool registration based on workspace.role
- [ ] Dynamic component hints in system prompt
- [ ] Role-based suggestions (hardcoded for now)
- [ ] Test: Different roles show different features

#### Day 2 Deliverable
✅ Contributor can find issues
✅ Maintainer can see triage queue and PRs

---

### Day 3: Both Mode + Polish + Demo (8-10 hours)

#### Block 1: "Both" Mode (2 hours)
- [ ] Combined suggestions for "both" role
- [ ] Section headers in welcome message
- [ ] All tools available
- [ ] Test: "Both" mode shows everything

#### Block 2: Thread Management (2 hours)
- [ ] Thread sidebar in workspace
- [ ] List existing threads
- [ ] Create new thread button
- [ ] Switch between threads
- [ ] Simple thread title (first message)

#### Block 3: Polish (2 hours)
- [ ] Loading states (skeletons)
- [ ] Error handling (API errors, invalid repos)
- [ ] Empty states ("No workspaces yet")
- [ ] Basic animations (fade in)
- [ ] Fix any bugs found

#### Block 4: Demo Prep (2-3 hours)
- [ ] Prepare demo repositories
  - One public repo (contributor demo)
  - One own repo (maintainer/both demo)
- [ ] Write demo script
- [ ] Record demo video (screen recording)
- [ ] Take screenshots
- [ ] Write README with setup instructions

#### Day 3 Deliverable
✅ Complete working app
✅ Demo video ready
✅ Submission materials ready

---

## 📁 Minimal File Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── layout.tsx                  # Providers
│   ├── login/page.tsx              # Login
│   ├── auth/callback/route.ts      # OAuth callback
│   └── workspace/[id]/page.tsx     # Workspace chat
│
├── components/
│   ├── auth/
│   │   ├── LoginButton.tsx
│   │   └── UserMenu.tsx
│   ├── workspace/
│   │   ├── WorkspaceCard.tsx
│   │   ├── AddWorkspaceModal.tsx
│   │   ├── WorkspaceHeader.tsx
│   │   └── ThreadSidebar.tsx
│   ├── contributor/
│   │   ├── IssueCard.tsx
│   │   └── IssueList.tsx
│   ├── maintainer/
│   │   ├── TriageCard.tsx
│   │   └── PRReviewCard.tsx
│   └── tambo/                      # Existing
│
├── hooks/
│   ├── useAuth.ts
│   ├── useGitHubToken.ts
│   ├── useWorkspaces.ts
│   └── useWorkspaceThreads.ts
│
└── lib/
    ├── supabase/client.ts
    ├── supabase/server.ts
    ├── github.ts
    └── tambo.ts
```

---

## 🧩 Components Summary

| Component | Type | Role | Priority |
|-----------|------|------|----------|
| IssueCard | Generative | Contributor | Must |
| IssueList | Generative | Contributor | Must |
| TriageCard | Generative | Maintainer | Must |
| PRReviewCard | Generative | Maintainer | Must |
| WorkspaceHeader | Interactable | All | Must |
| ThreadSidebar | Component | All | Should |

## 🔧 Tools Summary

| Tool | Role | Priority |
|------|------|----------|
| findGoodFirstIssues | Contributor | Must |
| getIssueDetails | Contributor | Must |
| getTriageQueue | Maintainer | Must |
| getPRQueue | Maintainer | Must |
| checkRepoAccess | Workspace | Must |

---

## ⚡ Speed Tips

1. **Use Tambo's existing components** - Don't rebuild MessageThread
2. **Hardcode suggestions** - Don't over-engineer dynamic suggestions
3. **Skip animations** - Add only if time permits on Day 3
4. **Use shadcn/ui** - Don't build buttons/modals from scratch
5. **Mock data fallback** - If GitHub rate limits hit, have mock data ready

---

## 🎬 3-Minute Demo Script

### Intro (15 sec)
"Open Source Hub - one platform, two experiences, endless possibilities"

### Login (15 sec)
- Show GitHub OAuth login
- Arrive at empty dashboard

### Contributor Flow (1 min)
- Add `facebook/react` → "Read-only access"
- Create workspace as Contributor
- "Find me good first issues" → IssueList appears
- Click issue → Details shown

### Maintainer Flow (1 min)
- Add own repo → "Write access detected"
- Choose "Both" role
- "Show triage queue" → TriageCard list
- "Review open PRs" → PRReviewCard

### Magic Moment (30 sec)
- Show thread sidebar (multiple conversations)
- Show role badge switching between workspaces
- "The UI adapts to YOU"

---

## ✅ Success Criteria (MVP)

- [ ] Can login with GitHub
- [ ] Can create workspace with any public repo
- [ ] Permission detection works
- [ ] Role selection appears for write access
- [ ] Chat works in workspace context
- [ ] Issues display correctly (Contributor)
- [ ] Triage/PRs display correctly (Maintainer)
- [ ] Both mode shows all features
- [ ] Demo video recorded
