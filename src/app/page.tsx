"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  Play,
  Pause,
  Volume2,
  Download,
  Loader2,
  Sparkles,
  Film,
  Mic,
  Upload,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Search,
  Smartphone,
  Monitor,
  Type,
  Palette,
  Move,
  Heading,
} from "lucide-react";

interface VideoTemplate {
  id: string;
  name: string;
  filename: string;
  url: string;
  sizeBytes?: number;
}

interface SubtitleWord {
  text: string;
  startSec: number;
  endSec: number;
}

interface SubtitlePhrase {
  text: string;
  startSec: number;
  endSec: number;
  words: SubtitleWord[];
}

const VOICES = [
  { id: "vi-VN-HoaiMyNeural", name: "Hoài My (Nữ - Truyền cảm, Tự nhiên)", lang: "vi-VN" },
  { id: "vi-VN-NamMinhNeural", name: "Nam Minh (Nam - Trầm ấm, Rõ ràng)", lang: "vi-VN" },
  { id: "en-US-JennyNeural", name: "Jenny (Nữ - Tiếng Anh US)", lang: "en-US" },
  { id: "en-US-GuyNeural", name: "Guy (Nam - Tiếng Anh US)", lang: "en-US" },
];

const SUBTITLE_COLORS = [
  { id: "yellow", name: "Vàng TikTok", hex: "#FACC15", border: "#000000" },
  { id: "white", name: "Trắng Sáng", hex: "#FFFFFF", border: "#000000" },
  { id: "cyan", name: "Xanh Cyan", hex: "#22D3EE", border: "#000000" },
  { id: "green", name: "Xanh Neon", hex: "#4ADE80", border: "#000000" },
];

export default function VideoAutoLoopApp() {
  // State: Templates
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // State: Aspect Ratio (Mặc định 9:16)
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");

  // State: TTS & Script
  const [scriptText, setScriptText] = useState(
    "Chào bạn! Đây là công cụ tự động tạo video ghép giọng nói trí tuệ nhân tạo. Bạn có thể chọn bất kỳ mẫu video nào có sẵn trong thư mục, nhập kịch bản cần đọc và hệ thống sẽ tự động ghép audio TTS với video, lặp lại video mượt mà cho khớp độ dài kịch bản!"
  );
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [speechRate, setSpeechRate] = useState(0); // -40 to +40

  // State: Subtitle Options
  const [enableSubtitles, setEnableSubtitles] = useState(true);
  const [subtitleColor, setSubtitleColor] = useState(SUBTITLE_COLORS[0]);
  const [subtitleFontSize, setSubtitleFontSize] = useState<"sm" | "md" | "lg">("md");
  const [rawWords, setRawWords] = useState<SubtitleWord[]>([]);

  // State: Main Title, Dragging & Resize
  const [mainTitle, setMainTitle] = useState("BÍ QUYẾT THÀNH CÔNG");
  const [showMainTitle, setShowMainTitle] = useState(true);
  const [titlePos, setTitlePos] = useState<{ x: number; y: number }>({ x: 50, y: 15 }); // tính theo % (0 - 100)
  const [titleWidth, setTitleWidth] = useState<number>(80); // chiều rộng khung tiêu đề theo % (30% - 95%)
  const [titleFontSize, setTitleFontSize] = useState<"sm" | "md" | "lg">("md");
  const [titleColor, setTitleColor] = useState(SUBTITLE_COLORS[0]);
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch danh sách templates từ API
  useEffect(() => {
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
  }, []);

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

  // Lọc mẫu video theo từ khóa tìm kiếm
  const filteredTemplates = templates.filter(
    (tpl) =>
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
  const togglePlay = async () => {
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
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
    setCurrentTime(0);
  };

  // Kéo thả Tiêu đề chính (Mouse & Touch drag)
  const handleTitlePointerDown = (e: React.PointerEvent) => {
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
  };

  // Kéo thay đổi độ rộng (Resize Width) trực tiếp trên video
  const handleTitleResizeDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const initialWidth = titleWidth;

    const onResizeMove = (moveEvent: PointerEvent) => {
      if (!playerContainerRef.current) return;
      const rect = playerContainerRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - startX;
      // Quy đổi deltaX sang % của playerContainer
      const deltaPercent = (deltaX / rect.width) * 100 * 2; // nhân 2 vì căn giữa (translate -50%)
      const newWidth = Math.max(30, Math.min(95, Math.round(initialWidth + deltaPercent)));
      setTitleWidth(newWidth);
    };

    const onResizeUp = () => {
      window.removeEventListener("pointermove", onResizeMove);
      window.removeEventListener("pointerup", onResizeUp);
    };

    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", onResizeUp);
  };

  // Upload video mẫu từ máy tính
  const handleUploadCustomVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  // Tải FFmpeg WebAssembly
  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    setExportStatusText("Đang nạp thư viện xử lý FFmpeg WebAssembly...");
    const ffmpeg = new FFmpeg();

    ffmpeg.on("progress", ({ progress }) => {
      // FFmpeg WASM đôi khi trả về progress âm hoặc NaN khi chưa biết tổng thời lượng
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

  // Hàm bẻ dòng chữ cho canvas dựa theo max width
  const wrapTextLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
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

      // Kích thước chuẩn xuất video: 1080x1920 (9:16) hoặc 1920x1080 (16:9)
      const targetWidth = aspectRatio === "9:16" ? 1080 : 1920;
      const targetHeight = aspectRatio === "9:16" ? 1920 : 1080;

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Không thể tạo canvas 2D context.");

      // Chuẩn bị video element ẩn để render từng frame
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

      // Chuẩn bị audio element
      const renderAudio = new Audio();
      const audioObjUrl = URL.createObjectURL(audioBlob);
      renderAudio.src = audioObjUrl;

      await new Promise<void>((resolve) => {
        renderAudio.onloadedmetadata = () => resolve();
      });

      const totalDuration = renderAudio.duration || audioDuration || 5;

      // Thiết lập MediaRecorder để thu lại canvas kết hợp audio
      const canvasStream = canvas.captureStream(30); // 30 FPS
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const audioSource = audioCtx.createMediaElementSource(renderAudio);
      const audioDestination = audioCtx.createMediaStreamDestination();
      audioSource.connect(audioDestination);

      // Ghép audio track vào stream
      audioDestination.stream.getAudioTracks().forEach((track) => {
        canvasStream.addTrack(track);
      });

      // Khởi tạo MediaRecorder: Ưu tiên mp4/avc1 (chuẩn QuickTime) nếu browser hỗ trợ (như Safari / Chrome mới)
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
        videoBitsPerSecond: 6000000, // 6 Mbps chất lượng cao
      });

      const recordedChunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      // Vòng lặp render từng frame (Draw Background Video + Smart Crop + Title + Subtitles)
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

        // 1. Vẽ background video (Smart Crop)
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

        // 2. Vẽ Tiêu đề chính (Main Title) nếu bật
        if (showMainTitle && mainTitle.trim()) {
          const titleX = (titlePos.x / 100) * targetWidth;
          const titleY = (titlePos.y / 100) * targetHeight;
          const maxTitleBoxWidth = (titleWidth / 100) * targetWidth;

          // Cỡ chữ theo tỉ lệ xuất 1080p
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

            // Shadow / Outline đen dày
            ctx.lineJoin = "round";
            ctx.lineWidth = Math.round(baseSize * 0.22);
            ctx.strokeStyle = "#000000";
            ctx.strokeText(line, titleX, y);

            // Màu chữ chính
            ctx.fillStyle = titleColor.hex;
            ctx.fillText(line, titleX, y);
          });
        }

        // 3. Vẽ Phụ đề Karaoke đổi màu theo từng từ nếu bật
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

            // Đo tổng chiều rộng của cả câu để căn giữa
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

              // Tô màu chữ: nếu đang đọc thì tô màu nổi bật (subtitleColor), ngược lại là màu trắng
              ctx.fillStyle = isSpeaking ? subtitleColor.hex : "#FFFFFF";
              ctx.fillText(wText, wordCenterX, subY);

              startX += wWidth + spaceWidth;
            });
          }
        }

        requestAnimationFrame(renderLoop);
      };

      // Bắt đầu quay & chạy video + audio
      recorder.start(100);
      await renderVideo.play();
      await renderAudio.play();
      renderLoop();

      // Đợi audio kết thúc (hoặc timeout dự phòng)
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

      // Tắt stream
      canvasStream.getTracks().forEach((t) => t.stop());
      try {
        audioCtx.close();
      } catch {}

      setExportStatusText("Đang đóng gói file MP4 chất lượng cao bằng FFmpeg...");
      // Đóng gói và tối ưu codec cho tương thích 100% với QuickTime (macOS/iOS) & Android
      const recordedBlob = new Blob(recordedChunks, { type: mimeType });

      // Gọi API convert sang chuẩn H.264 / AAC tương thích 100% với QuickTime Player & Apple
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
        // Fallback xử lý bằng FFmpeg WebAssembly nếu không kết nối được API
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
      {/* Header */}
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
                {aspectRatio} • {templates.length} mẫu
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cột Trái: Chọn Tỉ Lệ, Mẫu Video, Kịch Bản & Cài Đặt (Cuộn độc lập, mượt mà) (7 cols) */}
          <div className="lg:col-span-7 space-y-6 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-3 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {/* Step 1: Chọn Tỉ lệ khung hình (Mặc định 9:16) */}
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
                  onClick={() => setAspectRatio("9:16")}
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
                  onClick={() => setAspectRatio("16:9")}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    aspectRatio === "16:9"
                      ? "border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500 text-white"
                      : "border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded border-2 border-current flex items-center justify-center">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-slate-100">16:9</div>
                      <div className="text-[11px] text-slate-400">YouTube, Màn hình ngang</div>
                    </div>
                  </div>
                  {aspectRatio === "16:9" && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </button>
              </div>
            </section>

            {/* Step 2: Chọn mẫu video */}
            <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                    2
                  </span>
                  <h2 className="font-semibold text-slate-200">
                    Chọn Mẫu Video ({templates.length} mẫu)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm mẫu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-28 sm:w-36 bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadCustomVideo}
                    accept="video/mp4,video/webm"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Tải mẫu khác
                  </button>
                </div>
              </div>

              {isLoadingTemplates ? (
                <div className="py-12 flex justify-center items-center text-slate-400 text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách mẫu video...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-1">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = selectedTemplate?.id === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplate(tpl);
                          setDownloadUrl(null);
                        }}
                        className={`cursor-pointer rounded-xl border p-2 transition group relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-950/30 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500"
                            : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="aspect-video w-full rounded-lg bg-slate-950 relative overflow-hidden flex items-center justify-center mb-1.5">
                          <video
                            src={tpl.url}
                            muted
                            playsInline
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play()}
                            onMouseOut={(e) => {
                              const v = e.currentTarget as HTMLVideoElement;
                              v.pause();
                              v.currentTime = 0;
                            }}
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-indigo-600 rounded-full p-0.5 text-white shadow">
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-xs text-slate-200 truncate">
                            {tpl.name}
                          </h3>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {tpl.filename}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Step 3: Soạn kịch bản, Giọng đọc & Tùy biến Phụ đề */}
            <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                    3
                  </span>
                  <h2 className="font-semibold text-slate-200">Kịch bản, Giọng đọc & Phụ Đề AI</h2>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="font-medium text-indigo-400">
                    {scriptText.trim().split(/\s+/).filter(Boolean).length} từ
                  </span>
                  <span>•</span>
                  <span>Ước tính ~{Math.round(scriptText.trim().split(/\s+/).filter(Boolean).length / 3)}s</span>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                rows={4}
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="Nhập nội dung kịch bản văn bản..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none placeholder:text-slate-500 leading-relaxed"
              />

              {/* Voice & Speed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-indigo-400" />
                    Giọng đọc AI (Edge-TTS)
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
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
                    onChange={(e) => setSpeechRate(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              {/* Subtitle Customization Box */}
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
                      onChange={(e) => setEnableSubtitles(e.target.checked)}
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
                            onClick={() => setSubtitleColor(c)}
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
                            onClick={() => setSubtitleFontSize(size)}
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

              {/* Main Title Customization Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heading className="w-4 h-4 text-purple-400" />
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Tiêu đề chính (Kéo thả tự do)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Có thể nhấn giữ và kéo thả trực tiếp trên khung video
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMainTitle}
                      onChange={(e) => setShowMainTitle(e.target.checked)}
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
                          onClick={() => setTitlePos({ x: 50, y: 15 })}
                          className="text-[10px] text-purple-400 hover:text-purple-300 transition"
                        >
                          Đưa về vị trí mặc định (Top 15%)
                        </button>
                      </div>
                      <input
                        type="text"
                        value={mainTitle}
                        onChange={(e) => setMainTitle(e.target.value)}
                        placeholder="Nhập tiêu đề chính video..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-semibold"
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
                              onClick={() => setTitleColor(c)}
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
                              onClick={() => setTitleFontSize(size)}
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

                    {/* Điều chỉnh độ rộng (Chiều ngang) của khung tiêu đề */}
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
                        onChange={(e) => setTitleWidth(Number(e.target.value))}
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
                onClick={handleGenerateTTS}
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
          </div>

          {/* Cột Phải: Preview Đồng Bộ & Xuất MP4 (Cố định ở vị trí dễ nhìn, không bị trôi) (5 cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
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
                    onPointerDown={handleTitlePointerDown}
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
                        className="break-words w-full select-none"
                      >
                        {mainTitle}
                      </span>

                      {/* Icon Move ở giữa khi hover */}
                      <span className="absolute -top-3 right-1/2 translate-x-1/2 opacity-0 group-hover/title:opacity-100 transition-opacity bg-purple-600 text-white rounded-full p-1 shadow-md">
                        <Move className="w-2.5 h-2.5" />
                      </span>

                      {/* Nút kéo co giãn chiều rộng (Resize Handle bên phải) */}
                      <div
                        onPointerDown={handleTitleResizeDown}
                        title="Nhấn giữ và kéo để chỉnh độ rộng / xuống dòng"
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-7 bg-purple-500 hover:bg-purple-400 rounded cursor-ew-resize opacity-0 group-hover/title:opacity-100 transition-opacity flex items-center justify-center shadow-lg border border-white/50"
                      >
                        <div className="w-0.5 h-3.5 bg-white rounded-full"></div>
                      </div>

                      {/* Nút kéo co giãn chiều rộng (Resize Handle bên trái) */}
                      <div
                        onPointerDown={handleTitleResizeDown}
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
                        // Từ đang được đọc
                        const isSpeaking =
                          currentTime >= w.startSec && currentTime <= w.endSec + 0.15;
                        // Từ đã đọc qua
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
                    onTimeUpdate={handleAudioTimeUpdate}
                    onEnded={handleAudioEnded}
                  />
                )}

                {/* Nút Play to đè giữa khung hình */}
                <div
                  onClick={togglePlay}
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
                      onClick={togglePlay}
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
              </div>

              {/* Nút Xuất Video */}
              <div className="w-full mt-5 pt-4 border-t border-slate-800">
                {!downloadUrl ? (
                  <button
                    onClick={handleExportMP4}
                    disabled={isExporting || !audioBlob}
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
                      onClick={() => setDownloadUrl(null)}
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
          </div>
        </div>
      </main>
    </div>
  );
}
