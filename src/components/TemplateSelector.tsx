import React, { useRef } from "react";
import { Search, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { VideoTemplate } from "@/types/video";

interface TemplateSelectorProps {
  templates: VideoTemplate[];
  selectedTemplate: VideoTemplate | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading: boolean;
  onSelectTemplate: (template: VideoTemplate) => void;
  onUploadCustomVideo: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TemplateSelector = React.memo(function TemplateSelector({
  templates,
  selectedTemplate,
  searchQuery,
  onSearchChange,
  isLoading,
  onSelectTemplate,
  onUploadCustomVideo,
}: TemplateSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredTemplates = templates.filter(
    (tpl) =>
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-28 sm:w-36 bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onUploadCustomVideo}
            accept="video/mp4,video/webm"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Tải mẫu khác
          </button>
        </div>
      </div>

      {isLoading ? (
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
                onClick={() => onSelectTemplate(tpl)}
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
  );
});
