"use client";

import { cn } from "@/lib/utils";
import { pickSafeDomProps } from "@/components/tambo/shared/safe-dom-props";
import { useTamboComponentState } from "@tambo-ai/react";
import { ChevronDown, ChevronRight, FileText, Folder, Scissors } from "lucide-react";
import * as React from "react";
import { z } from "zod";

const repoTreeItemSchema = z
  .object({
    path: z.string().describe("Full path for the tree item"),
    type: z
      .enum(["file", "dir"])
      .describe("Whether the item is a file or directory"),
    size: z.number().optional().describe("Optional file size in bytes"),
  });

export const githubRepoTreeSchema = z
  .object({
    title: z
      .string()
      .optional()
      .describe("Title displayed above the repository tree"),
    repoFullName: z
      .string()
      .optional()
      .describe(
        "Optional repository full name in the form 'owner/repo'. Used to derive a stable default state key.",
      ),
    stateKey: z
      .string()
      .optional()
      .describe(
        "Optional state key to persist selection/expansion across renders. Use the same key across components to coordinate state.",
      ),
    tree: z.array(repoTreeItemSchema).describe("Repository tree items"),
    truncated: z
      .boolean()
      .optional()
      .describe(
        "Whether results were truncated due to size limits (true means not all files are shown)",
      ),
    initialSelectedPath: z
      .string()
      .optional()
      .describe("Optional initial selected file path"),
  })
  .describe(
    "Shows a GitHub repository file tree. Users can click to select a file path.",
  );

type RepoTreeItem = z.infer<typeof repoTreeItemSchema>;

type RepoTreeState = {
  selectedPath: string | null;
  expandedPaths: Record<string, boolean>;
};

export type GitHubRepoTreeProps = z.infer<typeof githubRepoTreeSchema> &
  React.HTMLAttributes<HTMLDivElement>;

function getRowLabel(path?: string) {
  if (!path) return "(unknown)";
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function sortTree(items: RepoTreeItem[]) {
  return [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });
}

export function GitHubRepoTree({
  title = "Repository tree",
  repoFullName,
  stateKey,
  tree = [],
  truncated,
  initialSelectedPath,
  className,
  ...props
}: GitHubRepoTreeProps) {
  const resolvedStateKey =
    stateKey ?? `github-repo-tree:${repoFullName ?? title ?? "default"}`;

  const initialExpandedPaths = React.useMemo(() => {
    const expanded: Record<string, boolean> = {};

    for (const item of tree) {
      if (!item?.path) continue;
      const parts = item.path.split("/").filter(Boolean);
      const topLevel = parts[0];
      if (!topLevel) continue;

      if (item.type === "dir" || parts.length > 1) {
        expanded[topLevel] = true;
      }
    }

    if (initialSelectedPath) {
      const parts = initialSelectedPath.split("/").filter(Boolean);
      let currentPath = "";

      for (const part of parts.slice(0, -1)) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        expanded[currentPath] = true;
      }
    }

    return expanded;
  }, [initialSelectedPath, tree]);

  const [state, setState] = useTamboComponentState<RepoTreeState>(
    resolvedStateKey,
    {
      selectedPath: initialSelectedPath ?? null,
      expandedPaths: initialExpandedPaths,
    },
  );

  React.useEffect(() => {
    if (!initialSelectedPath) return;
    if (!state) return;
    if (state.selectedPath) return;

    setState({
      selectedPath: initialSelectedPath,
      expandedPaths: state.expandedPaths,
    });
  }, [initialSelectedPath, setState, state]);

  React.useEffect(() => {
    if (!state) return;
    if (tree.length === 0) return;
    if (Object.keys(state.expandedPaths).length > 0) return;
    if (Object.keys(initialExpandedPaths).length === 0) return;

    setState({ ...state, expandedPaths: initialExpandedPaths });
  }, [initialExpandedPaths, setState, state, tree.length]);

  const items = React.useMemo(() => sortTree(tree), [tree]);
  const selectedPath = state?.selectedPath ?? null;
  const expandedPaths = state?.expandedPaths ?? {};

  type TreeNode = {
    name: string;
    path: string;
    type: RepoTreeItem["type"];
    size?: number;
    children: TreeNode[];
  };

  const root = React.useMemo(() => {
    const rootNode: TreeNode = {
      name: "",
      path: "",
      type: "dir",
      children: [],
    };

    const nodesByPath = new Map<string, TreeNode>();
    nodesByPath.set("", rootNode);

    const ensureNode = (parent: TreeNode, node: TreeNode) => {
      parent.children.push(node);
      nodesByPath.set(node.path, node);
      return node;
    };

    for (const item of items) {
      if (!item.path) continue;
      const parts = item.path.split("/").filter(Boolean);
      if (parts.length === 0) continue;

      let parent = rootNode;
      let currentPath = "";

      for (let index = 0; index < parts.length; index++) {
        const part = parts[index] ?? "";
        const isLeaf = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        const existing = nodesByPath.get(currentPath);
        if (existing) {
          if (isLeaf && item.type === "file") {
            existing.type = "file";
            existing.size = item.size;
          }
          parent = existing;
          continue;
        }

        const nodeType = isLeaf ? item.type : "dir";
        const next = ensureNode(parent, {
          name: part,
          path: currentPath,
          type: nodeType,
          size: nodeType === "file" ? item.size : undefined,
          children: [],
        });
        parent = next;
      }
    }

    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      for (const child of node.children) sortChildren(child);
    };

    sortChildren(rootNode);
    return rootNode;
  }, [items]);

  const toggleExpanded = (path: string) => {
    if (!state) return;

    const isExpanded = expandedPaths[path] ?? false;
    setState({
      ...state,
      expandedPaths: {
        ...expandedPaths,
        [path]: !isExpanded,
      },
    });
  };

  const selectPath = (path: string) => {
    if (!state) return;
    setState({ ...state, selectedPath: path });
  };

  const addToChat = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Dispatch a custom event that the MessageInput component listens for
    const event = new CustomEvent('tambo:append-input', {
      detail: { text: `@${path} ` }
    });
    window.dispatchEvent(event);
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const label = node.name || getRowLabel(node.path);
    const isSelected = node.type === "file" && node.path === selectedPath;
    const isExpanded = expandedPaths[node.path] ?? false;
    const paddingLeft = 12 + depth * 16;

    if (node.type === "dir") {
      return (
        <div key={node.path} className="group/row relative">
          <button
            type="button"
            onClick={() => toggleExpanded(node.path)}
            className={cn(
              "flex w-full items-center gap-2 py-1.5 pr-3 text-left",
              "hover:bg-muted/60 active:bg-muted/70 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
            style={{ paddingLeft }}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground/70" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground/70" />
            )}
            <Folder className={cn("size-3.5", isExpanded ? "text-primary/80" : "text-muted-foreground")} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {label}
              </div>
            </div>
          </button>
           <button
            type="button"
            onClick={(e) => addToChat(node.path, e)}
            className="absolute right-2 top-1.5 opacity-0 group-hover/row:opacity-100 p-0.5 rounded-sm hover:bg-background/80 text-muted-foreground hover:text-primary transition-all"
            title="Copy path for chat"
          >
            <span className="sr-only">Copy path</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
          {isExpanded ? node.children.map((child) => renderNode(child, depth + 1)) : null}
        </div>
      );
    }

    return (
      <div key={node.path} className="group/row relative">
        <button
          type="button"
          onClick={() => selectPath(node.path)}
          className={cn(
            "flex w-full items-center gap-2 py-1.5 pr-3 text-left",
            "hover:bg-muted/60 active:bg-muted/70 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            isSelected && "bg-primary/10 hover:bg-primary/15",
          )}
          style={{ paddingLeft }}
        >
          <FileText className={cn("size-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate text-sm font-medium text-foreground",
                isSelected && "font-semibold",
              )}
            >
              {label}
            </div>
            {isSelected && (
              <div className="truncate font-mono text-[10px] text-muted-foreground/80">
                {node.path}
              </div>
            )}
          </div>
          {typeof node.size === "number" ? (
            <div className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
              {node.size.toLocaleString("en-US")}B
            </div>
          ) : null}
        </button>
        <button
          type="button"
          onClick={(e) => addToChat(node.path, e)}
          className="absolute right-2 top-1.5 opacity-0 group-hover/row:opacity-100 p-0.5 rounded-sm hover:bg-background/80 text-muted-foreground hover:text-primary transition-all"
          title="Copy path for chat"
        >
          <span className="sr-only">Copy path</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </button>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "w-full rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5",
        "border border-emerald-500/50",
        "shadow-sm shadow-emerald-500/5 dark:shadow-emerald-500/10",
        className,
      )}
      {...pickSafeDomProps(props)}
    >
      <div className="relative px-4 py-3 border-b border-emerald-500/20 bg-muted/30 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground flex items-center gap-2">
            <Folder className="size-4 text-primary/70" />
            {title}
          </h3>
          {selectedPath ? (
            <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              {selectedPath}
            </div>
          ) : null}
        </div>

        {truncated ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
            <Scissors className="size-3" />
            <span>Truncated</span>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="p-8 text-center">
          <Folder className="size-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No files to display</p>
        </div>
      ) : (
        <div className="max-h-[28rem] overflow-auto bg-background/30 custom-scrollbar">
          <div className="divide-y divide-dotted divide-muted-foreground/10">
            {root.children.map((child) => renderNode(child, 0))}
          </div>
        </div>
      )}
    </div>
  );
}
