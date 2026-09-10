import React from "react";
import { Film } from "lucide-react";

interface HeaderProps {
  aspectRatio: "9:16" | "16:9";
  templateCount: number;
}

export const Header = React.memo(function Header({
  aspectRatio,
  templateCount,
}: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              VideoLoop Studio
            </span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium border border-indigo-500/30">
              {aspectRatio} • {templateCount} mẫu
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-400 hidden sm:flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Auto Subtitles & Smart Crop
          </span>
        </div>
      </div>
    </header>
  );
});
