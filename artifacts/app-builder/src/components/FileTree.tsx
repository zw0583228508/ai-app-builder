import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileEntry {
  id: number;
  path: string;
  language: string;
  isEntrypoint: boolean;
}

interface TreeNode {
  name: string;
  path: string;
  file?: FileEntry;
  children: Record<string, TreeNode>;
}

function buildTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: {} };
  for (const f of files) {
    const parts = f.path.replace(/^\//, "").split("/");
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!cur.children[part]) {
        cur.children[part] = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          children: {},
        };
      }
      cur = cur.children[part];
      if (i === parts.length - 1) cur.file = f;
    }
  }
  return root;
}

const FILE_ICONS: Record<string, string> = {
  html: "🌐",
  css: "🎨",
  js: "🟨",
  jsx: "⚛️",
  ts: "🔷",
  tsx: "⚛️",
  json: "📋",
  md: "📝",
  py: "🐍",
  sh: "⚡",
  sql: "🗃️",
};

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICONS[ext] ?? "📄";
}

interface NodeProps {
  node: TreeNode;
  depth: number;
  selectedId: number | null;
  onSelect: (file: FileEntry) => void;
  onDelete?: (file: FileEntry) => void;
}

function TreeNodeItem({
  node,
  depth,
  selectedId,
  onSelect,
  onDelete,
}: NodeProps) {
  const isDir = !node.file && Object.keys(node.children).length > 0;
  const [open, setOpen] = useState(true);
  const isSelected = node.file ? node.file.id === selectedId : false;

  if (isDir) {
    return (
      <div>
        <button
          className="flex items-center gap-1.5 w-full px-2 py-1 hover:bg-white/5 rounded text-left"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
          {open ? (
            <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span className="text-xs text-foreground/80 truncate">
            {node.name}
          </span>
        </button>
        {open &&
          Object.values(node.children)
            .sort((a, b) => {
              const aIsDir = !a.file && Object.keys(a.children).length > 0;
              const bIsDir = !b.file && Object.keys(b.children).length > 0;
              if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
      </div>
    );
  }

  if (!node.file) return null;
  const f = node.file;
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group flex items-center gap-1.5 w-full py-1 rounded cursor-pointer transition-colors",
        isSelected
          ? "bg-primary/15 text-primary"
          : "hover:bg-white/5 text-foreground/70 hover:text-foreground",
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px`, paddingRight: "8px" }}
      onClick={() => onSelect(f)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(f)}
    >
      <span className="text-[11px] shrink-0">{fileIcon(f.path)}</span>
      <span className="text-xs truncate flex-1">{node.name}</span>
      {f.isEntrypoint && (
        <span className="text-[9px] px-1 py-0.5 bg-cyan-500/20 text-cyan-400 rounded shrink-0">
          entry
        </span>
      )}
      {onDelete && (
        <span
          role="button"
          tabIndex={0}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(f);
          }}
          onKeyDown={(e) => e.key === "Enter" && onDelete(f)}
        >
          <Trash2 className="w-2.5 h-2.5" />
        </span>
      )}
    </div>
  );
}

interface FileTreeProps {
  files: FileEntry[];
  selectedId: number | null;
  onSelect: (file: FileEntry) => void;
  onDelete?: (file: FileEntry) => void;
  onNewFile?: () => void;
}

export function FileTree({
  files,
  selectedId,
  onSelect,
  onDelete,
  onNewFile,
}: FileTreeProps) {
  const tree = buildTree(files);
  const sorted = Object.values(tree.children).sort((a, b) => {
    const aIsDir = !a.file && Object.keys(a.children).length > 0;
    const bIsDir = !b.file && Object.keys(b.children).length > 0;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col h-full" dir="ltr">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          קבצים
        </span>
        {onNewFile && (
          <button
            onClick={onNewFile}
            className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="קובץ חדש"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            אין קבצים עדיין
          </div>
        ) : (
          sorted.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
