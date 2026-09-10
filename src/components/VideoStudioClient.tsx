"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { AlertCircle } from "lucide-react";

import {
  VideoTemplate,
  SubtitleWord,
  SubtitlePhrase,
  VOICES,
  SUBTITLE_COLORS,
  SubtitleColor,
} from "@/types/video";

import { Header } from "@/components/Header";
import { AspectRatioSelector } from "@/components/AspectRatioSelector";
import { TemplateSelector } from "@/components/TemplateSelector";
import { ScriptSubtitleControls } from "@/components/ScriptSubtitleControls";
import { VideoPreviewPlayer } from "@/components/VideoPreviewPlayer";

interface VideoStudioClientProps {
  initialTemplates: VideoTemplate[];
}

export function VideoStudioClient({ initialTemplates }: VideoStudioClientProps) {
  // State: Templates
  const [templates, setTemplates] = useState<VideoTemplate[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(
    initialTemplates.length > 0 ? initialTemplates[0] : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // State: Aspect Ratio (Mặc định 9:16)
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");

  // State: TTS & Script
  const [scriptText, setScriptText] = useState(
    "Chào bạn! Đây là công cụ tự động tạo video ghép giọng nói trí tuệ nhân tạo. Bạn có thể chọn bất kỳ mẫu video nào có sẵn trong thư mục, nhập kịch bản cần đọc và hệ thống sẽ tự động ghép audio TTS với video, lặp lại video mượt mà cho khớp độ dài kịch bản!"
  );
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [speechRate, setSpeechRate] = useState(0);

  // State: Subtitle Options
  const [enableSubtitles, setEnableSubtitles] = useState(true);
  const [subtitleColor, setSubtitleColor] = useState<SubtitleColor>(SUBTITLE_COLORS[0]);
  const [subtitleFontSize, setSubtitleFontSize] = useState<"sm" | "md" | "lg">("md");
  const [rawWords, setRawWords] = useState<SubtitleWord[]>([]);

  // State: Main Title, Dragging & Resize
  const [mainTitle, setMainTitle] = useState("BÍ QUYẾT THÀNH CÔNG");
  const [showMainTitle, setShowMainTitle] = useState(true);
  const [titlePos, setTitlePos] = useState<{ x: number; y: number }>({ x: 50, y: 15 });
  const [titleWidth, setTitleWidth] = useState<number>(80);
  const [titleFontSize, setTitleFontSize] = useState<"sm" | "md" | "lg">("md");
  const [titleColor, setTitleColor] = useState<SubtitleColor>(SUBTITLE_COLORS[0]);
  const isDraggingTitleRef = useRef(false);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // State: Audio & Preview
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // State: Player sync
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // State: Exporting
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusText, setExportStatusText] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Fallback tải thêm templates client-side nếu SSR chưa có
  useEffect(() => {
    if (initialTemplates.length > 0) return;
    async function fetchTemplates() {
      try {
        setIsLoadingTemplates(true);
        const res = await fetch("/api/templates");
        const data = await res.json();
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
          setSelectedTemplate(data.templates[0]);
        }
      } catch (e) {
        console.error("Failed to load templates:", e);
      } finally {
        setIsLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, [initialTemplates]);

  // Đo thời lượng video mẫu khi chọn
  useEffect(() => {
    if (!selectedTemplate) return;
    const v = document.createElement("video");
    v.src = selectedTemplate.url;
    v.onloadedmetadata = () => {
      if (v.duration && !isNaN(v.duration)) {
        setVideoDuration(v.duration);
      }
    };
  }, [selectedTemplate]);

  // Gom các từ (Word Boundaries) thành từng cụm từ (Phrases) 3-4 từ để hiển thị nhịp nhàng
  const subtitlePhrases = useMemo<SubtitlePhrase[]>(() => {
    if (!rawWords || rawWords.length === 0) return [];

    const phrases: SubtitlePhrase[] = [];
    const WORDS_PER_PHRASE = 4;

    for (let i = 0; i < rawWords.length; i += WORDS_PER_PHRASE) {
      const chunk = rawWords.slice(i, i + WORDS_PER_PHRASE);
      const text = chunk.map((w) => w.text).join(" ");
      const startSec = chunk[0].startSec;
      const endSec = chunk[chunk.length - 1].endSec;
      phrases.push({ text, startSec, endSec, words: chunk });
    }

    return phrases;
  }, [rawWords]);

  // Tìm cụm phụ đề hiện tại theo currentTime
  const currentPhrase = useMemo(() => {
    if (!enableSubtitles) return null;
    return (
      subtitlePhrases.find(
        (p) => currentTime >= p.startSec && currentTime <= p.endSec + 0.2
      ) || null
    );
  }, [currentTime, subtitlePhrases, enableSubtitles]);

  // Tính số vòng lặp ước tính
  const estimatedLoops =
    audioDuration > 0 && videoDuration > 0
      ? Math.ceil(audioDuration / videoDuration)
      : 1;

  // Sinh TTS từ API
  const handleGenerateTTS = async () => {
    if (!scriptText.trim()) {
      setErrorMessage("Vui lòng nhập nội dung kịch bản văn bản.");
      return;
    }

    setErrorMessage(null);
    setIsGeneratingTTS(true);
    setDownloadUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: scriptText,
          voice: selectedVoice,
          rate: speechRate,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Không thể tạo file âm thanh TTS.");
      }

      const data = await res.json();
      if (!data.audioBase64) {
        throw new Error("Không nhận được dữ liệu âm thanh.");
      }

      // Chuyển base64 sang Blob
      const base64Content = data.audioBase64.split(",")[1];
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "audio/mpeg" });

      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);
      setRawWords(data.subtitles || []);

      // Đo thời lượng audio
      const tempAudio = new Audio();
      tempAudio.src = url;
      tempAudio.onloadedmetadata = () => {
        setAudioDuration(tempAudio.duration);
      };
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tạo giọng nói.");
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // Đồng bộ Play/Pause giữa Video Loop và Audio
  const togglePlay = useCallback(async () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      setIsPlaying(false);
      videoRef.current.pause();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      setIsPlaying(true);
      try {
        if (audioRef.current) {
          audioRef.current.currentTime = currentTime;
          await audioRef.current.play();
        }
        await videoRef.current.play();
      } catch {
        // Tránh browser unhandled AbortError nếu bấm pause nhanh
      }
    }
  }, [isPlaying, currentTime]);

  const handleAudioTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
    setCurrentTime(0);
  }, []);

  // Kéo thả Tiêu đề chính (Mouse & Touch drag)
  const handleTitlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingTitleRef.current = true;

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingTitleRef.current || !playerContainerRef.current) return;
      const rect = playerContainerRef.current.getBoundingClientRect();
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;

      // Giới hạn trong khung 5% - 95%
      const clampedX = Math.max(5, Math.min(95, Math.round(x)));
      const clampedY = Math.max(5, Math.min(95, Math.round(y)));
      setTitlePos({ x: clampedX, y: clampedY });
    };

    const onPointerUp = () => {
      isDraggingTitleRef.current = false;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }, []);

  // Kéo thay đổi độ rộng (Resize Width) trực tiếp trên video
  const handleTitleResizeDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const initialWidth = titleWidth;

    const onResizeMove = (moveEvent: PointerEvent) => {
      if (!playerContainerRef.current) return;
      const rect = playerContainerRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / rect.width) * 100 * 2;
      const newWidth = Math.max(30, Math.min(95, Math.round(initialWidth + deltaPercent)));
      setTitleWidth(newWidth);
    };

    const onResizeUp = () => {
      window.removeEventListener("pointermove", onResizeMove);
      window.removeEventListener("pointerup", onResizeUp);
    };

    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", onResizeUp);
  }, [titleWidth]);

  // Upload video mẫu từ máy tính
  const handleUploadCustomVideo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const customTpl: VideoTemplate = {
      id: `custom-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      filename: file.name,
      url: url,
      sizeBytes: file.size,
    };

    setTemplates((prev) => [customTpl, ...prev]);
    setSelectedTemplate(customTpl);
  }, []);

  // Tải FFmpeg WebAssembly
  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    setExportStatusText("Đang nạp thư viện xử lý FFmpeg WebAssembly...");
    const ffmpeg = new FFmpeg();

    ffmpeg.on("progress", ({ progress }) => {
      if (typeof progress === "number" && !isNaN(progress) && progress >= 0 && progress <= 1) {
        setExportProgress(Math.min(95 + Math.round(progress * 5), 99));
      }
    });

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  // Hàm bẻ dòng chữ cho canvas dựa theo max width và hỗ trợ phím Enter (xuống dòng)
  const wrapTextLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const paragraphs = text.split("\n");
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push("");
        continue;
      }
      const words = paragraph.split(/\s+/);
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  };

  // Xuất file MP4 hoàn chỉnh với Tiêu Đề Chính & Phụ Đề AI (Burn-in 100% vào video)
  const handleExportMP4 = async () => {
    if (!audioBlob) {
      setErrorMessage("Vui lòng nhấn nút 'Tạo giọng nói AI' trước khi xuất video.");
      return;
    }
    if (!selectedTemplate) {
      setErrorMessage("Vui lòng chọn một mẫu video.");
      return;
    }

    setErrorMessage(null);
    setIsExporting(true);
    setExportProgress(0);
    setDownloadUrl(null);

    try {
      setExportStatusText("Đang chuẩn bị render hình ảnh, tiêu đề và phụ đề...");

      const targetWidth = aspectRatio === "9:16" ? 1080 : 1920;
      const targetHeight = aspectRatio === "9:16" ? 1920 : 1080;

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Không thể tạo canvas 2D context.");

      const renderVideo = document.createElement("video");
      renderVideo.src = selectedTemplate.url;
      renderVideo.crossOrigin = "anonymous";
      renderVideo.muted = true;
      renderVideo.playsInline = true;
      renderVideo.loop = true;

      await new Promise<void>((resolve, reject) => {
        renderVideo.onloadedmetadata = () => resolve();
        renderVideo.onerror = () => reject(new Error("Không thể tải video mẫu để render."));
      });

      const renderAudio = new Audio();
      const audioObjUrl = URL.createObjectURL(audioBlob);
      renderAudio.src = audioObjUrl;

      await new Promise<void>((resolve) => {
        renderAudio.onloadedmetadata = () => resolve();
      });

      const totalDuration = renderAudio.duration || audioDuration || 5;

      const canvasStream = canvas.captureStream(30);
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const audioSource = audioCtx.createMediaElementSource(renderAudio);
      const audioDestination = audioCtx.createMediaStreamDestination();
      audioSource.connect(audioDestination);

      audioDestination.stream.getAudioTracks().forEach((track) => {
        canvasStream.addTrack(track);
      });

      let mimeType = "video/mp4;codecs=avc1,mp4a.40.2";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/mp4";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=vp9,opus";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm;codecs=vp8,opus";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "video/webm";
      }

      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 6000000,
      });

      const recordedChunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      let isRecording = true;
      let lastProgressUpdate = 0;

      const renderLoop = () => {
        if (!isRecording) return;

        const curTime = renderAudio.currentTime;
        const now = Date.now();
        if (now - lastProgressUpdate > 250) {
          lastProgressUpdate = now;
          const progressPercent = Math.min(
            Math.max(1, Math.round((curTime / totalDuration) * 92)),
            92
          );
          setExportProgress(progressPercent);
          setExportStatusText(
            `Đang xử lý hình ảnh, khắc tiêu đề & phụ đề (${curTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s)...`
          );
        }

        const vw = renderVideo.videoWidth || targetWidth;
        const vh = renderVideo.videoHeight || targetHeight;
        const vAspect = vw / vh;
        const tAspect = targetWidth / targetHeight;

        let sx = 0,
          sy = 0,
          sWidth = vw,
          sHeight = vh;
        if (vAspect > tAspect) {
          sWidth = vh * tAspect;
          sx = (vw - sWidth) / 2;
        } else {
          sHeight = vw / tAspect;
          sy = (vh - sHeight) / 2;
        }

        ctx.drawImage(renderVideo, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        if (showMainTitle && mainTitle.trim()) {
          const titleX = (titlePos.x / 100) * targetWidth;
          const titleY = (titlePos.y / 100) * targetHeight;
          const maxTitleBoxWidth = (titleWidth / 100) * targetWidth;

          const baseSize =
            titleFontSize === "sm"
              ? targetWidth * 0.045
              : titleFontSize === "md"
              ? targetWidth * 0.058
              : targetWidth * 0.075;

          ctx.font = `900 ${Math.round(baseSize)}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const lines = wrapTextLines(ctx, mainTitle.toUpperCase(), maxTitleBoxWidth);
          const lineHeight = baseSize * 1.25;
          const totalTextHeight = lines.length * lineHeight;
          const startY = titleY - totalTextHeight / 2 + lineHeight / 2;

          lines.forEach((line, idx) => {
            const y = startY + idx * lineHeight;
            ctx.lineJoin = "round";
            ctx.lineWidth = Math.round(baseSize * 0.22);
            ctx.strokeStyle = "#000000";
            ctx.strokeText(line, titleX, y);

            ctx.fillStyle = titleColor.hex;
            ctx.fillText(line, titleX, y);
          });
        }

        if (enableSubtitles) {
          const activePhrase = subtitlePhrases.find(
            (p) => curTime >= p.startSec && curTime <= p.endSec + 0.2
          );

          if (activePhrase) {
            const subY = targetHeight - (aspectRatio === "9:16" ? 280 : 160);
            const subSize =
              subtitleFontSize === "sm"
                ? targetWidth * 0.045
                : subtitleFontSize === "md"
                ? targetWidth * 0.055
                : targetWidth * 0.068;

            ctx.font = `900 ${Math.round(subSize)}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const spaceWidth = ctx.measureText(" ").width;
            const wordWidths = activePhrase.words.map((w) =>
              ctx.measureText(w.text.toUpperCase()).width
            );
            const totalPhraseWidth =
              wordWidths.reduce((a, b) => a + b, 0) +
              (activePhrase.words.length - 1) * spaceWidth;

            let startX = (targetWidth - totalPhraseWidth) / 2;

            activePhrase.words.forEach((wordObj, wIdx) => {
              const wText = wordObj.text.toUpperCase();
              const wWidth = wordWidths[wIdx];
              const wordCenterX = startX + wWidth / 2;

              const isSpeaking =
                curTime >= wordObj.startSec && curTime <= wordObj.endSec + 0.15;

              ctx.lineJoin = "round";
              ctx.lineWidth = Math.round(subSize * 0.2);
              ctx.strokeStyle = "#000000";
              ctx.strokeText(wText, wordCenterX, subY);

              ctx.fillStyle = isSpeaking ? subtitleColor.hex : "#FFFFFF";
              ctx.fillText(wText, wordCenterX, subY);

              startX += wWidth + spaceWidth;
            });
          }
        }

        requestAnimationFrame(renderLoop);
      };

      recorder.start(100);
      await renderVideo.play();
      await renderAudio.play();
      renderLoop();

      await new Promise<void>((resolve) => {
        renderAudio.onended = () => resolve();
        setTimeout(() => resolve(), (totalDuration + 1.5) * 1000);
      });

      isRecording = false;
      recorder.stop();
      renderVideo.pause();

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      canvasStream.getTracks().forEach((t) => t.stop());
      try {
        audioCtx.close();
      } catch {}

      setExportStatusText("Đang đóng gói file MP4 chất lượng cao...");
      const recordedBlob = new Blob(recordedChunks, { type: mimeType });

      const formData = new FormData();
      formData.append("video", recordedBlob, "recorded.bin");

      const transcodeRes = await fetch("/api/transcode", {
        method: "POST",
        body: formData,
      }).catch(() => null);

      if (transcodeRes && transcodeRes.ok) {
        const mp4Blob = await transcodeRes.blob();
        const url = URL.createObjectURL(mp4Blob);
        setDownloadUrl(url);
      } else {
        const ffmpeg = await loadFFmpeg();
        const recordedData = await fetchFile(recordedBlob);
        await ffmpeg.writeFile("recorded.bin", recordedData);

        await ffmpeg.exec([
          "-i",
          "recorded.bin",
          "-c:v",
          "copy",
          "-c:a",
          "copy",
          "-movflags",
          "+faststart",
          "final_output.mp4",
        ]);

        const finalData = await ffmpeg.readFile("final_output.mp4");
        const outBlob = new Blob([finalData as unknown as BlobPart], { type: "video/mp4" });
        const url = URL.createObjectURL(outBlob);
        setDownloadUrl(url);
      }

      setExportStatusText("Đã hoàn tất! Video chuẩn tương thích 100% QuickTime.");
      setExportProgress(100);
    } catch (err: unknown) {
      console.error("Export Error:", err);
      setErrorMessage(
        "Lỗi khi render video: " + (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      <Header aspectRatio={aspectRatio} templateCount={templates.length} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cột Trái: Cuộn độc lập mượt mà */}
          <div className="lg:col-span-7 space-y-6 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            <AspectRatioSelector
              aspectRatio={aspectRatio}
              onChange={(ratio) => setAspectRatio(ratio)}
            />

            <TemplateSelector
              templates={templates}
              selectedTemplate={selectedTemplate}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              isLoading={isLoadingTemplates}
              onSelectTemplate={(tpl) => {
                setSelectedTemplate(tpl);
                setDownloadUrl(null);
              }}
              onUploadCustomVideo={handleUploadCustomVideo}
            />

            <ScriptSubtitleControls
              scriptText={scriptText}
              onScriptChange={setScriptText}
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
              speechRate={speechRate}
              onSpeechRateChange={setSpeechRate}
              enableSubtitles={enableSubtitles}
              onEnableSubtitlesChange={setEnableSubtitles}
              subtitleColor={subtitleColor}
              onSubtitleColorChange={setSubtitleColor}
              subtitleFontSize={subtitleFontSize}
              onSubtitleFontSizeChange={setSubtitleFontSize}
              mainTitle={mainTitle}
              onMainTitleChange={setMainTitle}
              showMainTitle={showMainTitle}
              onShowMainTitleChange={setShowMainTitle}
              titleColor={titleColor}
              onTitleColorChange={setTitleColor}
              titleFontSize={titleFontSize}
              onTitleFontSizeChange={setTitleFontSize}
              titleWidth={titleWidth}
              onTitleWidthChange={setTitleWidth}
              titlePos={titlePos}
              onResetTitlePos={() => setTitlePos({ x: 50, y: 15 })}
              isGeneratingTTS={isGeneratingTTS}
              onGenerateTTS={handleGenerateTTS}
            />
          </div>

          {/* Cột Phải: Preview Đồng Bộ & Xuất MP4 (Cố định ở vị trí dễ nhìn, không bị trôi) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            <VideoPreviewPlayer
              aspectRatio={aspectRatio}
              selectedTemplate={selectedTemplate}
              videoRef={videoRef}
              audioRef={audioRef}
              playerContainerRef={playerContainerRef}
              showMainTitle={showMainTitle}
              mainTitle={mainTitle}
              titlePos={titlePos}
              titleWidth={titleWidth}
              titleFontSize={titleFontSize}
              titleColor={titleColor}
              onTitlePointerDown={handleTitlePointerDown}
              onTitleResizeDown={handleTitleResizeDown}
              enableSubtitles={enableSubtitles}
              subtitleFontSize={subtitleFontSize}
              subtitleColor={subtitleColor}
              currentPhrase={currentPhrase}
              rawWords={rawWords}
              audioUrl={audioUrl}
              audioDuration={audioDuration}
              videoDuration={videoDuration}
              estimatedLoops={estimatedLoops}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTogglePlay={togglePlay}
              onAudioTimeUpdate={handleAudioTimeUpdate}
              onAudioEnded={handleAudioEnded}
              hasAudioBlob={!!audioBlob}
              isExporting={isExporting}
              exportProgress={exportProgress}
              exportStatusText={exportStatusText}
              downloadUrl={downloadUrl}
              onExportMP4={handleExportMP4}
              onResetDownloadUrl={() => setDownloadUrl(null)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
