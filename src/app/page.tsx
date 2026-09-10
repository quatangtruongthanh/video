import { getInitialTemplates } from "@/lib/templates";
import { VideoStudioClient } from "@/components/VideoStudioClient";

export const metadata = {
  title: "VideoLoop Studio - Tự Động Ghép Giọng AI & Video Lặp",
  description: "Công cụ tự động tạo video ghép giọng nói trí tuệ nhân tạo, phụ đề tự động và tiêu đề kéo thả tự do.",
};

export default function HomePage() {
  // Lấy danh sách video templates trực tiếp trên server (SSR - Zero Client Waterfall)
  const initialTemplates = getInitialTemplates();

  return <VideoStudioClient initialTemplates={initialTemplates} />;
}
