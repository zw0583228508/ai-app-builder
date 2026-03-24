import JSZip from "jszip";
import * as XLSX from "xlsx";

export interface ProcessedFile {
  name: string;
  type: string;
  data: string;
  size: number;
  preview?: string;
  mimeType: "text" | "image" | "document";
}

export async function processZipFile(file: File): Promise<ProcessedFile> {
  const zip = await JSZip.loadAsync(file);
  const lines: string[] = [`# 📦 קובץ ZIP: ${file.name}\n`];
  const treeLines: string[] = [];
  const contentLines: string[] = [];
  const folders = new Set<string>();

  const sortedFiles = Object.entries(zip.files).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [path, entry] of sortedFiles) {
    if (entry.dir) {
      folders.add(path);
      treeLines.push(`📁 ${path}`);
    } else {
      const depth = path.split("/").length - 1;
      const indent = "  ".repeat(depth);
      const ext = path.split(".").pop()?.toLowerCase() || "";
      const fileIcon = getFileIcon(ext);
      treeLines.push(`${indent}${fileIcon} ${path.split("/").pop()}`);

      const isTextLike =
        /\.(txt|html|css|js|ts|jsx|tsx|json|md|yaml|yml|xml|sql|py|rb|php|sh|env|gitignore|dockerfile|toml|ini|cfg|conf|csv|scss|sass|less|vue|svelte|kt|swift|go|rs|c|cpp|h|java|cs)$/i.test(
          path,
        );
      if (isTextLike) {
        try {
          const text = await entry.async("string");
          const preview =
            text.length > 800 ? text.slice(0, 800) + "\n... (קוצר)" : text;
          contentLines.push(`\`\`\`${ext}\n// 📄 ${path}\n${preview}\n\`\`\``);
        } catch {
          contentLines.push(`// ⚠️ ${path} — לא ניתן לקרוא`);
        }
      }
    }
  }

  lines.push("## 🗂️ מבנה תיקיות:\n```");
  lines.push(...treeLines);
  lines.push("```\n");
  lines.push(
    `**${sortedFiles.filter(([, e]) => !e.dir).length} קבצים** | **${folders.size} תיקיות**\n`,
  );

  if (contentLines.length > 0) {
    lines.push("## 📝 תוכן הקבצים:\n");
    lines.push(...contentLines.slice(0, 10));
    if (contentLines.length > 10) {
      lines.push(`\n... ועוד ${contentLines.length - 10} קבצים נוספים.`);
    }
  }

  return {
    name: file.name,
    type: file.type || "application/zip",
    data: lines.join("\n"),
    size: file.size,
    mimeType: "text",
  };
}

export async function processExcelFile(file: File): Promise<ProcessedFile> {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });
  const lines: string[] = [`# 📊 קובץ Excel: ${file.name}\n`];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    const rows = csv.split("\n").filter(Boolean);
    lines.push(`## גיליון: ${sheetName} (${rows.length} שורות)\n`);
    lines.push("```csv");
    lines.push(...rows.slice(0, 50));
    if (rows.length > 50) lines.push(`... ועוד ${rows.length - 50} שורות`);
    lines.push("```\n");
  }

  return {
    name: file.name,
    type: file.type,
    data: lines.join("\n"),
    size: file.size,
    mimeType: "text",
  };
}

export async function processDocxFile(file: File): Promise<ProcessedFile> {
  const { default: mammoth } = await import("mammoth");
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  const text = result.value;
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const content = `# 📄 מסמך Word: ${file.name}\n\n**מילים:** ${wordCount}\n\n---\n\n${text.slice(0, 4000)}${text.length > 4000 ? "\n\n... (הטקסט קוצר)" : ""}`;

  return {
    name: file.name,
    type: file.type,
    data: content,
    size: file.size,
    mimeType: "text",
  };
}

export async function processAudioFile(file: File): Promise<ProcessedFile> {
  const audioCtx = new AudioContext();
  const buf = await file.arrayBuffer();
  let duration = 0;
  let channels = 0;
  let sampleRate = 0;

  try {
    const decoded = await audioCtx.decodeAudioData(buf.slice(0));
    duration = decoded.duration;
    channels = decoded.numberOfChannels;
    sampleRate = decoded.sampleRate;
    audioCtx.close();
  } catch {
    audioCtx.close();
  }

  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60)
    .toString()
    .padStart(2, "0");
  const ext = file.name.split(".").pop()?.toUpperCase() || "AUDIO";

  let transcription = "";
  try {
    transcription = await transcribeAudioInBrowser(file);
  } catch {
    transcription = "(לא זמינה — נסה טקסט בקשה ידנית)";
  }

  const content = `# 🎵 קובץ שמע: ${file.name}\n\n| פרמטר | ערך |\n|-------|-----|\n| פורמט | ${ext} |\n| משך | ${mins}:${secs} |\n| ערוצים | ${channels || "?"} |\n| קצב דגימה | ${sampleRate ? sampleRate.toLocaleString() + " Hz" : "?"} |\n| גודל | ${formatBytes(file.size)} |\n\n## 📝 תמלול:\n${transcription}`;

  return {
    name: file.name,
    type: file.type,
    data: content,
    size: file.size,
    mimeType: "text",
  };
}

export async function processVideoFile(file: File): Promise<ProcessedFile> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;

      video.currentTime = Math.min(2, duration * 0.1);

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(width, 1280);
        canvas.height = Math.round(canvas.width * (height / width));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("canvas error"));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameBase64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        URL.revokeObjectURL(url);

        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60)
          .toString()
          .padStart(2, "0");
        const ext = file.name.split(".").pop()?.toUpperCase() || "VIDEO";

        const meta = `# 🎬 קובץ וידאו: ${file.name}\n\n| פרמטר | ערך |\n|-------|-----|\n| פורמט | ${ext} |\n| משך | ${mins}:${secs} |\n| רזולוציה | ${width}×${height} |\n| גודל | ${formatBytes(file.size)} |\n\n*הפריים הראשון מהווידאו מצורף כתמונה לניתוח.*`;

        resolve({
          name: file.name,
          type: file.type,
          data: meta,
          size: file.size,
          preview: `data:image/jpeg;base64,${frameBase64}`,
          mimeType: "image",
        });
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("video load error"));
    };
  });
}

async function transcribeAudioInBrowser(file: File): Promise<string> {
  if (
    !("webkitSpeechRecognition" in window) &&
    !("SpeechRecognition" in window)
  ) {
    return "(זיהוי דיבור לא נתמך בדפדפן זה — נסה Chrome)";
  }

  return new Promise((resolve) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "he-IL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    const audioEl = document.createElement("audio");
    audioEl.src = URL.createObjectURL(file);
    audioEl.onended = () => recognition.stop();

    let finalText = "";

    recognition.onresult = (e: any) => {
      finalText += Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
    };

    recognition.onend = () => {
      URL.revokeObjectURL(audioEl.src);
      resolve(finalText || "(לא זוהה טקסט)");
    };

    recognition.onerror = () => resolve("(שגיאה בזיהוי דיבור)");

    recognition.start();
    audioEl.play().catch(() => {});
  });
}

function getFileIcon(ext: string): string {
  const icons: Record<string, string> = {
    html: "🌐",
    css: "🎨",
    js: "⚡",
    ts: "🔷",
    json: "📋",
    md: "📝",
    txt: "📄",
    py: "🐍",
    rb: "💎",
    php: "🐘",
    sql: "🗄️",
    sh: "💻",
    env: "🔒",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    svg: "🎭",
    pdf: "📕",
    zip: "📦",
    mp3: "🎵",
    wav: "🎵",
    mp4: "🎬",
    csv: "📊",
    xlsx: "📊",
    docx: "📄",
    yaml: "⚙️",
    yml: "⚙️",
    toml: "⚙️",
    go: "🐹",
    rs: "🦀",
    kt: "🎯",
    swift: "🍎",
    c: "⚙️",
    cpp: "⚙️",
    java: "☕",
  };
  return icons[ext] || "📄";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
