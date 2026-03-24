import { Users } from "lucide-react";

const HE = "'Rubik', sans-serif";

interface CollabPresenceBadgeProps {
  viewerCount: number;
}

export function CollabPresenceBadge({ viewerCount }: CollabPresenceBadgeProps) {
  if (viewerCount <= 1) return null;

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-medium"
      title={`${viewerCount} משתמשים צופים עכשיו`}
      style={{ fontFamily: HE }}
    >
      <Users className="w-3 h-3" />
      <span>{viewerCount}</span>
    </div>
  );
}
