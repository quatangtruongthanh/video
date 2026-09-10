export interface VideoTemplate {
  id: string;
  name: string;
  filename: string;
  url: string;
  sizeBytes?: number;
}

export interface SubtitleWord {
  text: string;
  startSec: number;
  endSec: number;
}

export interface SubtitlePhrase {
  text: string;
  startSec: number;
  endSec: number;
  words: SubtitleWord[];
}

export interface SubtitleColor {
  id: string;
  name: string;
  hex: string;
  border: string;
}

export const VOICES = [
  { id: "vi-VN-HoaiMyNeural", name: "Hoài My (Nữ - Truyền cảm, Tự nhiên)", lang: "vi-VN" },
  { id: "vi-VN-NamMinhNeural", name: "Nam Minh (Nam - Trầm ấm, Rõ ràng)", lang: "vi-VN" },
  { id: "en-US-JennyNeural", name: "Jenny (Nữ - Tiếng Anh US)", lang: "en-US" },
  { id: "en-US-GuyNeural", name: "Guy (Nam - Tiếng Anh US)", lang: "en-US" },
];

export const SUBTITLE_COLORS: SubtitleColor[] = [
  { id: "yellow", name: "Vàng TikTok", hex: "#FACC15", border: "#000000" },
  { id: "white", name: "Trắng Sáng", hex: "#FFFFFF", border: "#000000" },
  { id: "cyan", name: "Xanh Cyan", hex: "#22D3EE", border: "#000000" },
  { id: "green", name: "Xanh Neon", hex: "#4ADE80", border: "#000000" },
];
