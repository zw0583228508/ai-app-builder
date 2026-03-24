import {
  FileText,
  FileCode,
  Image,
  Music,
  Video,
  FileSpreadsheet,
  Archive,
  FileType,
} from "lucide-react";
import {
  processZipFile,
  processExcelFile,
  processDocxFile,
  processAudioFile,
  processVideoFile,
} from "@/lib/file-processors";
import type { Attachment } from "@/hooks/use-chat-stream";

export function AttachmentIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <Image className="w-3.5 h-3.5" />;
  if (type === "application/pdf") return <FileText className="w-3.5 h-3.5" />;
  return <FileCode className="w-3.5 h-3.5" />;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/zip",
  "application/x-zip-compressed",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/m4a",
  "audio/webm",
  "audio/x-m4a",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
  "video/ogg",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/css",
  "application/json",
  "application/javascript",
  "text/javascript",
  "text/typescript",
  "text/x-python",
  "text/x-java-source",
  "text/x-c",
  "text/xml",
  "application/xml",
  "application/yaml",
  ".zip",
  ".xlsx",
  ".xls",
  ".csv",
  ".docx",
  ".doc",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".aac",
  ".m4a",
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".md",
  ".txt",
  ".json",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".rb",
  ".php",
  ".go",
  ".rs",
  ".java",
  ".cs",
  ".c",
  ".cpp",
  ".html",
  ".css",
  ".scss",
  ".yaml",
  ".yml",
  ".toml",
  ".sql",
  ".sh",
].join(",");

export type FileCategory =
  | "image"
  | "pdf"
  | "zip"
  | "excel"
  | "docx"
  | "audio"
  | "video"
  | "text";

export function detectFileCategory(file: File): FileCategory {
  const t = file.type.toLowerCase();
  const n = file.name.toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t === "application/pdf") return "pdf";
  if (t.includes("zip") || t.includes("x-zip") || /\.zip$/i.test(n))
    return "zip";
  if (
    t.includes("spreadsheet") ||
    t.includes("excel") ||
    /\.(xlsx|xls)$/i.test(n)
  )
    return "excel";
  if (
    t.includes("wordprocessingml") ||
    t.includes("msword") ||
    /\.docx?$/i.test(n)
  )
    return "docx";
  if (t.startsWith("audio/") || /\.(mp3|wav|ogg|flac|aac|m4a)$/i.test(n))
    return "audio";
  if (t.startsWith("video/") || /\.(mp4|webm|mov|avi|mkv|mpeg)$/i.test(n))
    return "video";
  return "text";
}

export function getAttachmentIcon(category: string) {
  switch (category) {
    case "image":
      return <Image className="w-3 h-3" />;
    case "audio":
      return <Music className="w-3 h-3" />;
    case "video":
      return <Video className="w-3 h-3" />;
    case "excel":
      return <FileSpreadsheet className="w-3 h-3" />;
    case "zip":
      return <Archive className="w-3 h-3" />;
    case "docx":
      return <FileType className="w-3 h-3" />;
    case "pdf":
      return <FileText className="w-3 h-3" />;
    default:
      return <FileCode className="w-3 h-3" />;
  }
}

export async function readFileAsAttachment(file: File): Promise<Attachment> {
  const category = detectFileCategory(file);

  if (category === "zip") {
    const result = await processZipFile(file);
    return { name: file.name, type: file.type, data: result.data, size: file.size };
  }
  if (category === "excel") {
    const result = await processExcelFile(file);
    return { name: file.name, type: file.type, data: result.data, size: file.size };
  }
  if (category === "docx") {
    const result = await processDocxFile(file);
    return { name: file.name, type: file.type, data: result.data, size: file.size };
  }
  if (category === "audio") {
    const result = await processAudioFile(file);
    return { name: file.name, type: file.type, data: result.data, size: file.size, preview: result.preview };
  }
  if (category === "video") {
    const result = await processVideoFile(file);
    return { name: file.name, type: file.type, data: result.data, size: file.size, preview: result.preview };
  }
  if (category === "image" || category === "pdf") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        const preview = category === "image" ? result : undefined;
        resolve({ name: file.name, type: file.type, data: base64, size: file.size, preview });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  const text = await file.text();
  return { name: file.name, type: file.type || "text/plain", data: text, size: file.size };
}
