import { lazy, Suspense } from "react";
import { Check, Loader2 } from "lucide-react";
import { FileTree, type FileEntry } from "@/components/FileTree";
import type { ProjectFile } from "@/hooks/use-project-files";
import { cn } from "@/lib/utils";

const CodeEditor = lazy(() =>
  import("@/components/CodeEditor").then((m) => ({ default: m.CodeEditor })),
);

const HE = "'Rubik', sans-serif";

interface DeleteFileMutation {
  mutate: (id: number) => void;
}

interface UpdateFileMutation {
  isPending: boolean;
}

interface CodeEditorTabProps {
  isStreaming: boolean;
  liveLines: number;
  projectFiles: ProjectFile[];
  selectedFileId: number | null;
  setSelectedFileId: (id: number | null) => void;
  deleteFileMutation: DeleteFileMutation;
  showNewFileDialog: boolean;
  setShowNewFileDialog: (val: boolean) => void;
  newFilePath: string;
  setNewFilePath: (val: string) => void;
  createNewFile: (path: string) => void;
  selectedFile: ProjectFile | null;
  editedFileContent: string;
  setEditedFileContent: (val: string) => void;
  saveSelectedFile: (content: string) => Promise<void>;
  updateFileMutation: UpdateFileMutation;
  fileSaved: boolean;
  editedHtml: string;
  setEditedHtml: (val: string) => void;
  previewHtml: string | null | undefined;
  userMode?: string;
  saveHtmlCode: (code: string) => void;
  codeSaving: boolean;
  codeSaved: boolean;
}

export function CodeEditorTab({
  isStreaming,
  liveLines,
  projectFiles,
  selectedFileId,
  setSelectedFileId,
  deleteFileMutation,
  showNewFileDialog,
  setShowNewFileDialog,
  newFilePath,
  setNewFilePath,
  createNewFile,
  selectedFile,
  editedFileContent,
  setEditedFileContent,
  saveSelectedFile,
  updateFileMutation,
  fileSaved,
  editedHtml,
  setEditedHtml,
  previewHtml,
  userMode,
  saveHtmlCode,
  codeSaving,
  codeSaved,
}: CodeEditorTabProps) {
  return (
    <div className="absolute inset-0 flex bg-[#1e1e1e]">
      {isStreaming && (
        <div className="absolute inset-0 bg-[#1e1e1e]/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p
            className="text-slate-400 text-sm font-medium"
            style={{ fontFamily: HE }}
          >
            כותב קוד...
          </p>
          <p className="text-slate-600 text-xs font-mono" dir="ltr">
            {liveLines.toLocaleString("en")} lines
          </p>
        </div>
      )}

      {/* File Tree Sidebar */}
      <div className="w-48 shrink-0 border-r border-white/5 bg-[#252526] flex flex-col overflow-hidden">
        <FileTree
          files={projectFiles as unknown as FileEntry[]}
          selectedId={selectedFileId}
          onSelect={(f) => setSelectedFileId(f.id)}
          onDelete={(f) => {
            deleteFileMutation.mutate(f.id);
            if (selectedFileId === f.id) setSelectedFileId(null);
          }}
          onNewFile={() => setShowNewFileDialog(true)}
        />
        {showNewFileDialog && (
          <div className="p-2 border-t border-white/5" dir="ltr">
            <input
              autoFocus
              type="text"
              placeholder="e.g. styles.css"
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createNewFile(newFilePath);
                if (e.key === "Escape") {
                  setShowNewFileDialog(false);
                  setNewFilePath("");
                }
              }}
              className="w-full text-xs bg-background border border-border rounded px-2 py-1 text-foreground outline-none focus:border-primary"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => createNewFile(newFilePath)}
                className="flex-1 text-xs py-1 bg-primary text-primary-foreground rounded hover:opacity-90"
              >
                צור
              </button>
              <button
                onClick={() => {
                  setShowNewFileDialog(false);
                  setNewFilePath("");
                }}
                className="flex-1 text-xs py-1 bg-muted text-muted-foreground rounded hover:opacity-80"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-4 py-2 bg-[#2d2d30] border-b border-white/5 shrink-0"
          dir="ltr"
        >
          <div className="flex items-center gap-2">
            {selectedFile ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedFile.path}
                </span>
                <span className="text-xs text-muted-foreground/50 ml-1">
                  {editedFileContent.split("\n").length} lines
                </span>
                {selectedFile.isEntrypoint && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                    entry
                  </span>
                )}
              </>
            ) : previewHtml ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-muted-foreground font-mono">
                  index.html
                </span>
                <span className="text-xs text-muted-foreground/50 ml-1">
                  {editedHtml.split("\n").length} lines
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">אין קובץ נבחר</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {userMode === "developer" && (
              <span
                className="text-[10px] text-emerald-400/70 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"
                style={{ fontFamily: HE }}
              >
                מצב מפתח
              </span>
            )}
            {selectedFile && editedFileContent !== selectedFile.content && (
              <button
                onClick={() => saveSelectedFile(editedFileContent)}
                disabled={updateFileMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {updateFileMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : fileSaved ? (
                  <Check className="w-3 h-3" />
                ) : null}
                {fileSaved
                  ? "נשמר"
                  : updateFileMutation.isPending
                    ? "שומר..."
                    : "שמור"}
              </button>
            )}
            {!selectedFile && editedHtml !== previewHtml && (
              <button
                onClick={() => saveHtmlCode(editedHtml)}
                disabled={codeSaving}
                className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {codeSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : codeSaved ? (
                  <Check className="w-3 h-3" />
                ) : null}
                {codeSaved ? "נשמר" : codeSaving ? "שומר..." : "שמור"}
              </button>
            )}
            <span className="text-[10px] text-muted-foreground/40 border border-white/10 rounded px-1.5 py-0.5">
              Ctrl+S
            </span>
          </div>
        </div>

        {/* Monaco editor */}
        <div className="flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                <span className="animate-spin mr-2">⟳</span> טוען עורך...
              </div>
            }
          >
            {selectedFile ? (
              <CodeEditor
                key={selectedFile.id}
                value={editedFileContent}
                language={selectedFile.language}
                onChange={setEditedFileContent}
                onSave={saveSelectedFile}
                height="100%"
              />
            ) : previewHtml ? (
              <CodeEditor
                value={editedHtml}
                language="html"
                onChange={setEditedHtml}
                onSave={saveHtmlCode}
                height="100%"
              />
            ) : (
              <div
                className="h-full flex items-center justify-center text-muted-foreground text-sm"
                dir="rtl"
                style={{ fontFamily: HE }}
              >
                אין קוד עדיין — שלח הודעה לAI
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
