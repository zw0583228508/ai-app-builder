import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Copy, Check, HardDrive, Image, FileText, Film, Music, File } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface StorageObject {
  id: number;
  projectId: number;
  name: string;
  objectPath: string;
  contentType: string;
  size: number;
  createdAt: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith("image/")) return <Image className="w-4 h-4 text-cyan-400" />;
  if (contentType.startsWith("video/")) return <Film className="w-4 h-4 text-purple-400" />;
  if (contentType.startsWith("audio/")) return <Music className="w-4 h-4 text-green-400" />;
  if (contentType.startsWith("text/")) return <FileText className="w-4 h-4 text-yellow-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
}

interface StoragePanelProps {
  projectId: number;
}

export function StoragePanel({ projectId }: StoragePanelProps) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["project-storage", projectId],
    queryFn: () => apiFetch<{ objects: StorageObject[] }>(`/api/projects/${projectId}/storage`).then(r => r.objects),
  });
  const objects = data ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/projects/${projectId}/storage/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-storage", projectId] }),
  });

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadProgress("מבקש URL להעלאה...");
    try {
      // Step 1: Get presigned URL
      const { uploadURL, objectPath } = await apiFetch<{ uploadURL: string; objectPath: string }>(
        `/api/projects/${projectId}/storage/upload-url`,
        { method: "POST", body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) }
      );

      // Step 2: Upload directly to GCS
      setUploadProgress("מעלה קובץ...");
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      // Step 3: Register in DB
      setUploadProgress("שומר...");
      await apiFetch(`/api/projects/${projectId}/storage`, {
        method: "POST",
        body: JSON.stringify({ name: file.name, objectPath, contentType: file.type, size: file.size }),
      });

      qc.invalidateQueries({ queryKey: ["project-storage", projectId] });
    } catch (err) {
      console.error(err);
      alert("העלאה נכשלה. אנא נסה שוב.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function getServeUrl(obj: StorageObject): string {
    return `/api/projects/${projectId}/storage/serve/${obj.id}`;
  }

  async function copyUrl(obj: StorageObject) {
    const url = window.location.origin + getServeUrl(obj);
    await navigator.clipboard.writeText(url);
    setCopiedId(obj.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const totalSize = objects.reduce((s, o) => s + (o.size || 0), 0);

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl" style={{ fontFamily: HE }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">אחסון קבצים</span>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            {objects.length} קבצים · {formatSize(totalSize)}
          </span>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? uploadProgress || "מעלה..." : "העלה קובץ"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      {/* Info banner */}
      <div className="mx-4 mt-3 mb-1 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg">
        <p className="text-xs text-slate-400 leading-relaxed">
          העלה תמונות, מסמכים ומדיה לשימוש בפרויקט. כל קובץ מקבל URL ציבורי שניתן לשלב ישירות בקוד.
        </p>
      </div>

      {/* Objects list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">טוען...</div>
        ) : objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500">
            <HardDrive className="w-10 h-10 opacity-30" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-400">אין קבצים עדיין</p>
              <p className="text-xs mt-1">לחץ על "העלה קובץ" להתחיל</p>
            </div>
          </div>
        ) : (
          objects.map(obj => (
            <div
              key={obj.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-white/5 hover:border-white/10 transition-all group"
            >
              {/* Thumbnail / icon */}
              <div className="w-10 h-10 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {obj.contentType.startsWith("image/") ? (
                  <img
                    src={getServeUrl(obj)}
                    alt={obj.name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <FileIcon contentType={obj.contentType} />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{obj.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {obj.contentType} · {formatSize(obj.size || 0)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => copyUrl(obj)}
                  title="העתק URL"
                  className="p-1.5 rounded-lg hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition-colors"
                >
                  {copiedId === obj.id ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(obj.id)}
                  title="מחק"
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload drop hint */}
      {!uploading && (
        <div
          className="mx-4 mb-4 border-2 border-dashed border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-cyan-500/50", "bg-cyan-500/5"); }}
          onDragLeave={e => { e.currentTarget.classList.remove("border-cyan-500/50", "bg-cyan-500/5"); }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-cyan-500/50", "bg-cyan-500/5");
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileUpload(file);
          }}
        >
          <Upload className="w-5 h-5 text-slate-500 mx-auto mb-1.5" />
          <p className="text-xs text-slate-500">גרור קובץ לכאן, או לחץ להעלאה</p>
        </div>
      )}
    </div>
  );
}
