import React from "react";
import { Smartphone, CheckCircle2 } from "lucide-react";

interface AspectRatioSelectorProps {
  aspectRatio: "9:16" | "16:9";
  onChange: (ratio: "9:16" | "16:9") => void;
}

export const AspectRatioSelector = React.memo(function AspectRatioSelector({
  aspectRatio,
  onChange,
}: AspectRatioSelectorProps) {
  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
            1
          </span>
          <h2 className="font-semibold text-slate-200">Chọn Tỉ Lệ Khung Hình</h2>
        </div>
        <span className="text-xs text-slate-400">Tự động Smart Crop vừa vặn</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange("9:16")}
          className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
            aspectRatio === "9:16"
              ? "border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500 text-white"
              : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-10 rounded border-2 border-current flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm text-slate-100">9:16 (Mặc định)</div>
              <div className="text-[11px] text-slate-400">TikTok, Reels, Shorts</div>
            </div>
          </div>
          {aspectRatio === "9:16" && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
        </button>

        <button
          type="button"
          onClick={() => onChange("16:9")}
          className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
            aspectRatio === "16:9"
              ? "border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500 text-white"
              : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-7 rounded border-2 border-current flex items-center justify-center">
              <div className="w-4 h-2.5 border border-current rounded-sm"></div>
            </div>
            <div className="text-left">
              <div className="font-bold text-sm text-slate-100">16:9 (Ngang)</div>
              <div className="text-[11px] text-slate-400">YouTube, Facebook TV</div>
            </div>
          </div>
          {aspectRatio === "16:9" && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
        </button>
      </div>
    </section>
  );
});
