import { useRef } from "react";
import { Pencil, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface ModeConfig {
  icon: string;
  label: string;
  bgColor: string;
  borderColor: string;
  color: string;
}

interface ChatHeaderProps {
  projectTitle: string;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (val: string) => void;
  onRenameSubmit: () => void;
  onRenameStart: () => void;
  onRenameCancel: () => void;
  modeConfig: ModeConfig;
  onOpenModeSelector: () => void;
  onExport: () => void;
  hasMessages: boolean;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatHeader({
  projectTitle,
  isRenaming,
  renameValue,
  onRenameValueChange,
  onRenameSubmit,
  onRenameStart,
  onRenameCancel,
  modeConfig,
  onOpenModeSelector,
  onExport,
  hasMessages,
  renameInputRef,
}: ChatHeaderProps) {
  return (
    <div className="h-[56px] border-b border-white/[0.05] flex items-center px-4 shrink-0 bg-[#0a0a0f] z-10 gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onRenameSubmit();
              if (e.key === "Escape") onRenameCancel();
            }}
            onBlur={onRenameSubmit}
            className="text-[13px] font-semibold bg-[#16161f] border border-indigo-500/40 rounded-lg px-2.5 py-1 text-slate-100 focus:outline-none flex-1 min-w-0"
            style={{ fontFamily: HE }}
          />
        ) : (
          <button
            onClick={onRenameStart}
            title="לחץ לשינוי שם פרויקט"
            className="text-[13px] font-semibold text-slate-200 truncate flex items-center gap-1.5 group hover:text-white transition-colors text-right flex-1 min-w-0"
            style={{ fontFamily: HE }}
          >
            <span className="truncate">{projectTitle}</span>
            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity shrink-0" />
          </button>
        )}
      </div>

      <button
        onClick={onOpenModeSelector}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all hover:opacity-90 shrink-0",
          modeConfig.bgColor,
          modeConfig.borderColor,
          modeConfig.color,
        )}
        style={{ fontFamily: HE }}
      >
        <span className="text-sm leading-none">{modeConfig.icon}</span>
        <span className="hidden sm:inline tracking-wide">
          {modeConfig.label}
        </span>
      </button>

      {hasMessages && (
        <button
          onClick={onExport}
          title="ייצוא שיחה"
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/[0.05] transition-all shrink-0"
        >
          <FileDown className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
