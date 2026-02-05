"use client";

import { cn } from "@/lib/utils";
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
  stateKey,
  tree = [],
  truncated,
  initialSelectedPath,
  className,
  ...props
}: GitHubRepoTreeProps) {
  const instanceId = React.useId();
  const resolvedStateKey = stateKey ?? `github-repo-tree:${instanceId}`;
  const [state, setState] = useTamboComponentState<RepoTreeState>(
    resolvedStateKey,
    { selectedPath: initialSelectedPath ?? null, expandedPaths: {} },
  );

  React.useEffect(() => {
    if (!initialSelectedPath) return;
    if (!state) return;
    if (state.selectedPath) return;

    setState({ ...state, selectedPath: initialSelectedPath });
  }, [initialSelectedPath, setState, state]);

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

    const isExpanded = expandedPaths[path] ?? true;
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

  const renderNode = (node: TreeNode, depth: number) => {
    const label = node.name || getRowLabel(node.path);
    const isSelected = node.type === "file" && node.path === selectedPath;
    const isExpanded = expandedPaths[node.path] ?? true;
    const paddingLeft = 12 + depth * 16;

    if (node.type === "dir") {
      return (
        <div key={node.path}>
          <button
            type="button"
            onClick={() => toggleExpanded(node.path)}
            className={cn(
              "flex w-full items-center gap-2 py-2 pr-3 text-left",
              "hover:bg-muted/40 transition-colors",
            )}
            style={{ paddingLeft }}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
            <Folder className="size-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {label}
              </div>
              <div className="truncate font-mono text-xs text-muted-foreground">
                {node.path}
              </div>
            </div>
          </button>
          {isExpanded ? node.children.map((child) => renderNode(child, depth + 1)) : null}
        </div>
      );
    }

    return (
      <button
        key={node.path}
        type="button"
        onClick={() => selectPath(node.path)}
        className={cn(
          "flex w-full items-center gap-2 py-2 pr-3 text-left",
          "hover:bg-muted/40 transition-colors",
          isSelected && "bg-muted/60",
        )}
        style={{ paddingLeft }}
      >
        <FileText className="size-4 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{label}</div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            {node.path}
          </div>
        </div>
        {typeof node.size === "number" ? (
          <div className="shrink-0 font-mono text-xs text-muted-foreground">
            {node.size.toLocaleString("en-US")}B
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-background",
        "p-4",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">
            {title}
          </h3>
          {selectedPath ? (
            <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
              Selected: {selectedPath}
            </div>
          ) : null}
        </div>

        {truncated ? (
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
            <Scissors className="size-3.5" /> Truncated
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No files.</p>
      ) : (
        <div className="mt-3 max-h-96 overflow-auto rounded-md border border-border">
          <div className="divide-y divide-border">
            {root.children.map((child) => renderNode(child, 0))}
          </div>
        </div>
      )}
    </div>
  );
}
