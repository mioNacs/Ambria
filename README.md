# Ambria - AI Companion for Open Source Work

Ambria is an intelligent workspace designed to streamline open source contributions. It leverages the power of the **Tambo AI** agent to help developers manage GitHub repositories, analyze issues, review pull requests, and perform actions directly from a unified dashboard.

## Features

- **AI-Powered Repository Intelligence**: Ask questions about your codebase, issues, or PRs and get context-aware answers.
- **Unified Dashboard**: Manage multiple GitHub repositories in a single "Workspace" view.
- **Smart Actions**:
  - **Issue Triage**: List, filter, assign, and close issues.
  - **PR Management**: Review diffs, file comments, and merge pull requests.
  - **Safe Write Operations**: Critical actions like merging PRs or closing issues require explicit user confirmation via a secure UI flow.
- **Repository Analysis**: Get insights into languages, contributors, and community health.

## Technologies Used

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Auth**: [Supabase](https://supabase.com/)
- **AI Agent**: [Tambo](https://tambo.ai/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A GitHub account
- A Supabase project
- A Tambo API Key

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/ambria.git
    cd ambria
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Setup:**

    Copy the example environment file to `.env.local`:

    ```bash
    cp example.env.local .env.local
    ```

    OPEN `.env.local` and fill in your credentials:

    ```env
    NEXT_PUBLIC_TAMBO_API_KEY=your_tambo_api_key_here
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

### Running Locally

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supabase Configuration

To enable GitHub login and repository access, you must configure Supabase Auth:

1.  Go to your Supabase Project Dashboard -> **Authentication** -> **Providers**.
2.  Enable **GitHub**.
3.  You will need to create a **GitHub OAuth App** (in GitHub Developer Settings).
    - **Homepage URL**: Your app's URL (e.g., `http://localhost:3000`)
    - **Authorization callback URL**: `https://<your-project>.supabase.co/auth/v1/callback`
4.  Copy the **Client ID** and **Client Secret** from GitHub to Supabase.

### Database Setup

To initialize the database schema (tables and security policies), run the provided SQL script:

1.  Open your Supabase Project Dashboard.
2.  Go to the **SQL Editor**.
3.  Click **New Query**.
4.  Copy and paste the contents of `supabase/schema.sql` into the editor.
5.  Click **Run**.

## User Guide

### 1. Onboarding
- **Log in**: Sign in using your GitHub account.
- **Create Workspace**: Click "Add Workspace" to connect a GitHub repository. You just need the owner and repo name (e.g., `facebook/react`).

### 2. Using the Agent
- Once a workspace is added, click on it to enter the chat interface.
- **Ask Questions**: "Show me the latest issues", "Who are the top contributors?", "Explain the repository structure".
- **Dynamic UI**: The agent will render interactive components (like Issue Cards or File Trees) directly in the chat stream.

### 3. Performing Actions
- When you ask the agent to perform a write action (e.g., "Close issue #42"), it will present a **Confirmation Card**.
- You must review the details and click "Confirm" to proceed. This ensures the AI never takes destructive actions without your approval.

## Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components/tambo`: Specialized UI components that the AI agent can render (e.g., `IssueList`, `ConfirmationDialog`).
- `src/lib/tambo.ts`: Central registry for Tambo tools and components. This defines what the AI can "see" and "do".
- `src/services/github-repo`: Logic for interacting with the GitHub API.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
