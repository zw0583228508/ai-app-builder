import { useRef, useCallback, useEffect, useState } from "react";
import MonacoEditor, { type OnMount, type Monaco } from "@monaco-editor/react";
import { Loader2, Users } from "lucide-react";

interface CodeEditorProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  projectId?: number;
  filePath?: string;
}

interface RemoteCursor {
  clientId: string;
  color: string;
  name: string;
  line: number;
  col: number;
  file: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  html: "html",
  css: "css",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  md: "markdown",
  py: "python",
  sh: "shell",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  sql: "sql",
};

export function inferLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "txt";
  return LANGUAGE_MAP[ext] ?? "plaintext";
}

export function CodeEditor({
  value,
  language = "html",
  onChange,
  onSave,
  readOnly = false,
  height = "100%",
  projectId,
  filePath,
}: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [conflictWarning, setConflictWarning] = useState(false);
  const lastRemoteEdit = useRef(0);

  // ── Collab WebSocket ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/api/collab?projectId=${projectId}&name=משתמש`);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as {
          type: string;
          cursors?: RemoteCursor[];
          viewerCount?: number;
          file?: string;
          clientId?: string;
        };
        if (msg.type === "presence") {
          setViewerCount(msg.viewerCount ?? 0);
          setRemoteCursors((msg.cursors ?? []).filter((c) => filePath ? c.file === filePath : true));
        }
        // Conflict warning: someone else is editing the same file as us (cursor moved in our file)
        if (msg.type === "cursor" && msg.file && filePath && msg.file === filePath) {
          lastRemoteEdit.current = Date.now();
          setConflictWarning(true);
          // Auto-dismiss after 8 seconds of no remote activity
          setTimeout(() => {
            if (Date.now() - lastRemoteEdit.current >= 8000) {
              setConflictWarning(false);
            }
          }, 8000);
        }
      } catch {}
    };

    ws.onclose = () => { wsRef.current = null; };

    // Heartbeat
    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, 30000);

    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, [projectId, filePath]);

  // ── Draw remote cursors in Monaco ────────────────────────────────────────
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const newDecorations = remoteCursors.map((rc) => ({
      range: new monaco.Range(rc.line || 1, rc.col || 1, rc.line || 1, (rc.col || 1) + 1),
      options: {
        className: `remote-cursor-${rc.clientId}`,
        glyphMarginClassName: `remote-cursor-glyph`,
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        hoverMessage: { value: `👤 ${rc.name}` },
        afterContentClassName: "remote-cursor-label",
        inlineClassName: `remote-cursor-inline`,
        zIndex: 100,
      },
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    // Inject cursor color styles dynamically
    const styleId = "remote-cursor-styles";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = remoteCursors.map((rc) => `
      .remote-cursor-${rc.clientId} {
        border-left: 2px solid ${rc.color};
        background: ${rc.color}22;
      }
    `).join("");
  }, [remoteCursors]);

  // ── Send cursor position on change ──────────────────────────────────────
  const sendCursor = useCallback((line: number, col: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "cursor", line, col, file: filePath ?? "" }));
    }
  }, [filePath]);

  const handleMount: OnMount = useCallback((ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;

    ed.addCommand(
      2048 | 49, // Ctrl+S / Cmd+S
      () => { if (onSave) onSave(ed.getValue()); }
    );

    // Send cursor position on cursor move
    ed.onDidChangeCursorPosition((e: { position: { lineNumber: number; column: number } }) => {
      sendCursor(e.position.lineNumber, e.position.column);
    });
  }, [onSave, sendCursor]);

  return (
    <div className="relative w-full h-full">
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        theme="vs-dark"
        onChange={(v) => onChange?.(v ?? "")}
        onMount={handleMount}
        loading={
          <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        }
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontLigatures: true,
          lineHeight: 1.7,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: "gutter",
          smoothScrolling: true,
          cursorSmoothCaretAnimation: "on",
          bracketPairColorization: { enabled: true },
        }}
      />

      {/* Viewer count badge */}
      {viewerCount > 1 && (
        <div
          className="absolute top-2 right-2 z-50 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] text-white/70 backdrop-blur-sm"
          style={{ fontFamily: "'Rubik', sans-serif" }}
        >
          <Users className="w-3 h-3 text-cyan-400" />
          <span>{viewerCount} צופים</span>
          <div className="flex gap-0.5">
            {remoteCursors.slice(0, 5).map((rc) => (
              <div
                key={rc.clientId}
                className="w-2 h-2 rounded-full"
                style={{ background: rc.color }}
                title={rc.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Conflict warning — shown when another user is editing the same file */}
      {conflictWarning && !readOnly && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/90 text-black text-[11px] font-medium shadow-lg"
          style={{ fontFamily: "'Rubik', sans-serif" }}
        >
          <Users className="w-3 h-3" />
          <span>משתמש אחר עורך קובץ זה — שמור לעתים קרובות</span>
          <button
            onClick={() => setConflictWarning(false)}
            className="ml-1 text-black/60 hover:text-black"
          >✕</button>
        </div>
      )}
    </div>
  );
}
