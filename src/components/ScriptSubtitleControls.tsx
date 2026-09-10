import React from "react";
import {
  Mic,
  Sliders,
  Type,
  Palette,
  Heading,
  Move,
  Loader2,
  Sparkles,
} from "lucide-react";
import { VOICES, SUBTITLE_COLORS, SubtitleColor } from "@/types/video";

interface ScriptSubtitleControlsProps {
  scriptText: string;
  onScriptChange: (text: string) => void;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  speechRate: number;
  onSpeechRateChange: (rate: number) => void;

  enableSubtitles: boolean;
  onEnableSubtitlesChange: (enabled: boolean) => void;
  subtitleColor: SubtitleColor;
  onSubtitleColorChange: (color: SubtitleColor) => void;
  subtitleFontSize: "sm" | "md" | "lg";
  onSubtitleFontSizeChange: (size: "sm" | "md" | "lg") => void;

  mainTitle: string;
  onMainTitleChange: (title: string) => void;
  showMainTitle: boolean;
  onShowMainTitleChange: (show: boolean) => void;
  titleColor: SubtitleColor;
  onTitleColorChange: (color: SubtitleColor) => void;
  titleFontSize: "sm" | "md" | "lg";
  onTitleFontSizeChange: (size: "sm" | "md" | "lg") => void;
  titleWidth: number;
  onTitleWidthChange: (width: number) => void;
  titlePos: { x: number; y: number };
  onResetTitlePos: () => void;

  isGeneratingTTS: boolean;
  onGenerateTTS: () => void;
}

export const ScriptSubtitleControls = React.memo(function ScriptSubtitleControls({
  scriptText,
  onScriptChange,
  selectedVoice,
  onVoiceChange,
  speechRate,
  onSpeechRateChange,
  enableSubtitles,
  onEnableSubtitlesChange,
  subtitleColor,
  onSubtitleColorChange,
  subtitleFontSize,
  onSubtitleFontSizeChange,
  mainTitle,
  onMainTitleChange,
  showMainTitle,
  onShowMainTitleChange,
  titleColor,
  onTitleColorChange,
  titleFontSize,
  onTitleFontSizeChange,
  titleWidth,
  onTitleWidthChange,
  titlePos,
  onResetTitlePos,
  isGeneratingTTS,
  onGenerateTTS,
}: ScriptSubtitleControlsProps) {
  const wordCount = scriptText.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round(wordCount / 3);

  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
            3
          </span>
          <h2 className="font-semibold text-slate-200">Kịch bản, Giọng đọc & Phụ Đề AI</h2>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <span className="font-medium text-indigo-400">{wordCount} từ</span>
          <span>•</span>
          <span>Ước tính ~{estimatedSeconds}s</span>
        </div>
      </div>

      {/* Textarea kịch bản */}
      <textarea
        rows={4}
        value={scriptText}
        onChange={(e) => onScriptChange(e.target.value)}
        placeholder="Nhập nội dung kịch bản văn bản..."
        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none placeholder:text-slate-500 leading-relaxed"
      />

      {/* Giọng đọc & Tốc độ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            Giọng đọc AI (Edge-TTS)
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Tốc độ đọc:
            </span>
            <span className="text-indigo-400 font-mono font-medium">
              {speechRate > 0 ? `+${speechRate}%` : `${speechRate}%`}
            </span>
          </div>
          <input
            type="range"
            min="-30"
            max="30"
            step="5"
            value={speechRate}
            onChange={(e) => onSpeechRateChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>

      {/* Cài đặt Phụ đề tự động */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-200">
              Hiển thị Phụ đề Tự động (Auto Subtitles)
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enableSubtitles}
              onChange={(e) => onEnableSubtitlesChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {enableSubtitles && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3 text-indigo-400" />
                Màu nổi bật khi đọc tới từ (Highlight):
              </span>
              <div className="flex items-center gap-2">
                {SUBTITLE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSubtitleColorChange(c)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      subtitleColor.id === c.id
                        ? "border-white scale-110 shadow-md ring-2 ring-indigo-500"
                        : "border-slate-800 hover:scale-105"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 mb-1.5 block">Cỡ chữ phụ đề:</span>
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {(["sm", "md", "lg"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onSubtitleFontSizeChange(size)}
                    className={`flex-1 py-1 text-xs rounded font-medium transition ${
                      subtitleFontSize === size
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {size === "sm" ? "Nhỏ" : size === "md" ? "Vừa" : "Lớn"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cài đặt Tiêu đề chính */}
      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heading className="w-4 h-4 text-purple-400" />
            <div>
              <span className="text-xs font-semibold text-slate-200">
                Tiêu đề chính (Kéo thả tự do)
              </span>
              <p className="text-[10px] text-slate-400">
                Nhấn giữ và kéo thả trực tiếp trên khung video (Enter để xuống dòng)
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showMainTitle}
              onChange={(e) => onShowMainTitleChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {showMainTitle && (
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-medium text-slate-400">
                  Nội dung tiêu đề:
                </label>
                <button
                  type="button"
                  onClick={onResetTitlePos}
                  className="text-[10px] text-purple-400 hover:text-purple-300 transition"
                >
                  Đưa về vị trí mặc định (Top 15%)
                </button>
              </div>
              <textarea
                rows={2}
                value={mainTitle}
                onChange={(e) => onMainTitleChange(e.target.value)}
                placeholder="Nhập tiêu đề chính video (hỗ trợ nhấn Enter để xuống dòng)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-semibold resize-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-purple-400" />
                  Màu chữ tiêu đề:
                </span>
                <div className="flex items-center gap-2">
                  {SUBTITLE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onTitleColorChange(c)}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        titleColor.id === c.id
                          ? "border-white scale-110 shadow-md ring-2 ring-purple-500"
                          : "border-slate-800 hover:scale-105"
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 mb-1.5 block">Cỡ chữ tiêu đề:</span>
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {(["sm", "md", "lg"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => onTitleFontSizeChange(size)}
                      className={`flex-1 py-1 text-xs rounded font-medium transition ${
                        titleFontSize === size
                          ? "bg-purple-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {size === "sm" ? "Nhỏ" : size === "md" ? "Vừa" : "Lớn"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Điều chỉnh độ rộng của khung tiêu đề */}
            <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Sliders className="w-3 h-3 text-purple-400" />
                  Độ rộng khung tiêu đề (Chiều dài chữ):
                </span>
                <span className="text-purple-400 font-mono font-medium">{titleWidth}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                step="5"
                value={titleWidth}
                onChange={(e) => onTitleWidthChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Hẹp (xuống dòng nhiều)</span>
                <span>Rộng (dàn ngang 1-2 dòng)</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
              <span className="flex items-center gap-1">
                <Move className="w-3 h-3 text-purple-400" />
                Vị trí: X: {titlePos.x}% | Y: {titlePos.y}% (Rộng: {titleWidth}%)
              </span>
              <span className="italic text-[10px] text-slate-400">
                Kéo thả trực tiếp hoặc kéo góc để đổi kích cỡ
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nút sinh giọng đọc TTS */}
      <button
        type="button"
        onClick={onGenerateTTS}
        disabled={isGeneratingTTS}
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGeneratingTTS ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tạo giọng nói và phụ đề AI...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Tạo giọng nói AI & Xem trước
          </>
        )}
      </button>
    </section>
  );
});
