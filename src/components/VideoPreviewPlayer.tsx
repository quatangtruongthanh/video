import React, { RefObject } from "react";
import {
  Layers,
  Move,
  Play,
  Pause,
  Volume2,
  Smartphone,
  Clock,
  Type,
  Download,
  Loader2,
  Music,
} from "lucide-react";
import {
  VideoTemplate,
  SubtitleColor,
  SubtitlePhrase,
  SubtitleWord,
} from "@/types/video";

interface VideoPreviewPlayerProps {
  aspectRatio: "9:16" | "16:9";
  selectedTemplate: VideoTemplate | null;
  videoRef: RefObject<HTMLVideoElement | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
  playerContainerRef: RefObject<HTMLDivElement | null>;

  // Title state
  showMainTitle: boolean;
  mainTitle: string;
  titlePos: { x: number; y: number };
  titleWidth: number;
  titleFontSize: "sm" | "md" | "lg";
  titleColor: SubtitleColor;
  onTitlePointerDown: (e: React.PointerEvent) => void;
  onTitleResizeDown: (e: React.PointerEvent) => void;

  // Subtitle state
  enableSubtitles: boolean;
  subtitleFontSize: "sm" | "md" | "lg";
  subtitleColor: SubtitleColor;
  currentPhrase: SubtitlePhrase | null;
  rawWords: SubtitleWord[];

  // Audio / sync state
  audioUrl: string | null;
  audioDuration: number;
  videoDuration: number;
  estimatedLoops: number;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onAudioTimeUpdate: () => void;
  onAudioEnded: () => void;

  // BGM
  selectedBgmUrl: string;
  selectedBgmName: string;
  bgmVolume: number;
  bgmAudioRef: RefObject<HTMLAudioElement | null>;

  // Export state
  hasAudioBlob: boolean;
  isExporting: boolean;
  exportProgress: number;
  exportStatusText: string;
  downloadUrl: string | null;
  onExportMP4: () => void;
  onResetDownloadUrl: () => void;
}

export const VideoPreviewPlayer = React.memo(function VideoPreviewPlayer({
  aspectRatio,
  selectedTemplate,
  videoRef,
  audioRef,
  playerContainerRef,
  showMainTitle,
  mainTitle,
  titlePos,
  titleWidth,
  titleFontSize,
  titleColor,
  onTitlePointerDown,
  onTitleResizeDown,
  enableSubtitles,
  subtitleFontSize,
  subtitleColor,
  currentPhrase,
  rawWords,
  audioUrl,
  audioDuration,
  videoDuration,
  estimatedLoops,
  currentTime,
  isPlaying,
  onTogglePlay,
  onAudioTimeUpdate,
  onAudioEnded,
  selectedBgmUrl,
  selectedBgmName,
  bgmVolume,
  bgmAudioRef,
  hasAudioBlob,
  isExporting,
  exportProgress,
  exportStatusText,
  downloadUrl,
  onExportMP4,
  onResetDownloadUrl,
}: VideoPreviewPlayerProps) {
  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
            4
          </span>
          <h2 className="font-semibold text-slate-200">
            Xem Trước Video ({aspectRatio})
          </h2>
        </div>

        {audioDuration > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
            <Layers className="w-3.5 h-3.5" />
            Lặp: ~{estimatedLoops} chu kỳ
          </span>
        )}
      </div>

      {/* Video Player Box với tỉ lệ được chọn (9:16 hoặc 16:9) */}
      <div
        ref={playerContainerRef}
        className={`relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl group transition-all duration-300 select-none ${
          aspectRatio === "9:16"
            ? "w-[260px] sm:w-[300px] aspect-[9/16]"
            : "w-full aspect-video"
        }`}
      >
        {selectedTemplate && (
          <video
            ref={videoRef}
            src={selectedTemplate.url}
            loop
            muted
            playsInline
            className="w-full h-full object-cover pointer-events-none"
          />
        )}

        {/* Tiêu đề chính: Có thể kéo thả tự do và kéo góc/cạnh để đổi chiều dài rộng */}
        {showMainTitle && mainTitle.trim() && (
          <div
            onPointerDown={onTitlePointerDown}
            style={{
              left: `${titlePos.x}%`,
              top: `${titlePos.y}%`,
              width: `${titleWidth}%`,
              transform: "translate(-50%, -50%)",
            }}
            className="absolute z-40 touch-none cursor-grab active:cursor-grabbing group/title flex items-center justify-center"
          >
            <div
              className={`relative w-full font-black uppercase tracking-wider text-center px-3 py-1.5 rounded-xl transition-all border border-dashed border-transparent group-hover/title:border-purple-400/80 group-hover/title:bg-black/35 flex flex-col items-center justify-center ${
                titleFontSize === "sm"
                  ? "text-xs sm:text-sm leading-tight"
                  : titleFontSize === "md"
                  ? "text-sm sm:text-base leading-snug"
                  : "text-base sm:text-xl leading-normal"
              }`}
            >
              <span
                style={{
                  color: titleColor.hex,
                  textShadow:
                    "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 10px rgba(0,0,0,0.9)",
                }}
                className="break-words w-full select-none whitespace-pre-line"
              >
                {mainTitle}
              </span>

              {/* Icon Move ở giữa khi hover */}
              <span className="absolute -top-3 right-1/2 translate-x-1/2 opacity-0 group-hover/title:opacity-100 transition-opacity bg-purple-600 text-white rounded-full p-1 shadow-md">
                <Move className="w-2.5 h-2.5" />
              </span>

              {/* Nút kéo co giãn chiều rộng (Resize Handle bên phải) */}
              <div
                onPointerDown={onTitleResizeDown}
                title="Nhấn giữ và kéo để chỉnh độ rộng / xuống dòng"
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-7 bg-purple-500 hover:bg-purple-400 rounded cursor-ew-resize opacity-0 group-hover/title:opacity-100 transition-opacity flex items-center justify-center shadow-lg border border-white/50"
              >
                <div className="w-0.5 h-3.5 bg-white rounded-full"></div>
              </div>

              {/* Nút kéo co giãn chiều rộng (Resize Handle bên trái) */}
              <div
                onPointerDown={onTitleResizeDown}
                title="Nhấn giữ và kéo để chỉnh độ rộng / xuống dòng"
                className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-7 bg-purple-500 hover:bg-purple-400 rounded cursor-ew-resize opacity-0 group-hover/title:opacity-100 transition-opacity flex items-center justify-center shadow-lg border border-white/50"
              >
                <div className="w-0.5 h-3.5 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {/* Subtitle Overlay: Chữ trắng mặc định, đổi màu nổi bật khi đọc tới từ đó */}
        {enableSubtitles && currentPhrase && (
          <div className="absolute inset-x-4 bottom-14 z-20 flex justify-center pointer-events-none">
            <div
              className={`font-black uppercase text-center tracking-wide leading-tight px-3 py-1.5 rounded-xl flex flex-wrap justify-center items-center gap-x-2 gap-y-1 ${
                subtitleFontSize === "sm"
                  ? "text-sm sm:text-base"
                  : subtitleFontSize === "md"
                  ? "text-base sm:text-xl"
                  : "text-lg sm:text-2xl"
              }`}
            >
              {currentPhrase.words.map((w, idx) => {
                const isSpeaking =
                  currentTime >= w.startSec && currentTime <= w.endSec + 0.15;
                const isSpoken = currentTime > w.endSec + 0.15;

                return (
                  <span
                    key={idx}
                    style={{
                      color: isSpeaking ? subtitleColor.hex : "#FFFFFF",
                      textShadow:
                        "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 8px rgba(0,0,0,0.9)",
                    }}
                    className={`transition-all duration-100 inline-block transform ${
                      isSpeaking
                        ? "scale-115 -translate-y-0.5"
                        : isSpoken
                        ? "opacity-90 scale-100"
                        : "opacity-80 scale-100"
                    }`}
                  >
                    {w.text}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Audio Sync */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={onAudioTimeUpdate}
            onEnded={onAudioEnded}
          />
        )}

        {/* BGM Audio (Loop) */}
        {selectedBgmUrl && (
          <audio
            ref={bgmAudioRef}
            src={selectedBgmUrl}
            loop
            preload="auto"
          />
        )}

        {/* Nút Play to đè giữa khung hình */}
        <div
          onClick={onTogglePlay}
          className="absolute inset-0 bg-black/30 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-30"
        >
          <div className="w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-xl hover:scale-110 transition">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </div>
        </div>

        {/* Thanh điều khiển dưới đáy Player */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between text-xs text-slate-200 z-30">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <span className="font-mono">
              {currentTime.toFixed(1)}s / {audioDuration ? audioDuration.toFixed(1) + "s" : "0.0s"}
            </span>
          </div>

          {audioUrl && (
            <span className="flex items-center gap-1 text-emerald-400 text-xs">
              <Volume2 className="w-3.5 h-3.5" />
              Đã ghép audio
            </span>
          )}
        </div>
      </div>

      {/* Bảng thông số đồng bộ */}
      <div className="w-full mt-4 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-2 text-xs">
        <div className="flex justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            Tỉ lệ xuất bản:
          </span>
          <span className="text-slate-200 font-bold">{aspectRatio}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Độ dài video mẫu:
          </span>
          <span className="font-mono text-slate-200">
            {videoDuration > 0 ? `${videoDuration.toFixed(1)}s` : "..."}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            Độ dài giọng đọc:
          </span>
          <span className="font-mono text-slate-200">
            {audioDuration > 0 ? `${audioDuration.toFixed(1)}s` : "Chưa tạo"}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-indigo-400" />
            Phụ đề tự động:
          </span>
          <span className="text-emerald-400 font-medium">
            {enableSubtitles
              ? `${rawWords.length} từ đã đồng bộ nhịp`
              : "Đang tắt"}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-indigo-400" />
            Nhạc nền:
          </span>
          <span className="text-slate-200 font-medium truncate max-w-[150px] text-right" title={selectedBgmName}>
            {selectedBgmUrl ? `${selectedBgmName} (${Math.round(bgmVolume * 100)}%)` : "Không dùng"}
          </span>
        </div>
      </div>

      {/* Nút Xuất Video */}
      <div className="w-full mt-5 pt-4 border-t border-slate-800">
        {!downloadUrl ? (
          <button
            type="button"
            onClick={onExportMP4}
            disabled={isExporting || !hasAudioBlob}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xuất video {aspectRatio} ({exportProgress}%)...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Xuất Video {aspectRatio} Hoàn Chỉnh
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3 w-full">
            <a
              href={downloadUrl}
              download={`video-${aspectRatio.replace(":", "x")}-${selectedTemplate?.id || "export"}.mp4`}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition"
            >
              <Download className="w-4 h-4" />
              Tải Video MP4 ({aspectRatio}) Về Máy
            </a>
            <button
              type="button"
              onClick={onResetDownloadUrl}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Tạo lại hoặc đổi mẫu khác
            </button>
          </div>
        )}

        {/* Progress bar */}
        {isExporting && (
          <div className="mt-4 space-y-1.5 w-full">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{exportStatusText}</span>
              <span className="font-mono text-indigo-400 font-medium">{exportProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
});
