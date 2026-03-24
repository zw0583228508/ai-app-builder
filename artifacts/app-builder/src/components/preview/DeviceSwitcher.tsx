import { Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeviceSize = "desktop" | "tablet" | "mobile";

interface DeviceSwitcherProps {
  deviceSize: DeviceSize;
  onDeviceChange: (size: DeviceSize) => void;
}

export function DeviceSwitcher({
  deviceSize,
  onDeviceChange,
}: DeviceSwitcherProps) {
  return (
    <div className="flex items-center gap-0 mr-1 bg-white/[0.03] rounded-md border border-white/[0.04]">
      {(
        [
          { key: "desktop" as const, Icon: Monitor, label: "מחשב" },
          { key: "tablet" as const, Icon: Tablet, label: "טאבלט" },
          { key: "mobile" as const, Icon: Smartphone, label: "מובייל" },
        ] as const
      ).map(({ key, Icon, label }) => (
        <button
          key={key}
          onClick={() => onDeviceChange(key)}
          title={label}
          className={cn(
            "p-1.5 rounded-md transition-all",
            deviceSize === key
              ? "text-slate-200 bg-white/[0.06]"
              : "text-slate-600 hover:text-slate-300",
          )}
        >
          <Icon className="w-3 h-3" />
        </button>
      ))}
    </div>
  );
}
