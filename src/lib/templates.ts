import fs from "fs";
import path from "path";
import { VideoTemplate } from "@/types/video";

export function getInitialTemplates(): VideoTemplate[] {
  try {
    const dir = path.join(process.cwd(), "public/templates");
    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs
      .readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith(".mp4"))
      .sort();

    return files.map((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      const name = file.replace(/\.mp4$/i, "");

      return {
        id: name,
        name: `Mẫu ${name}`,
        filename: file,
        url: `/templates/${file}`,
        sizeBytes: stat.size,
      };
    });
  } catch (err: unknown) {
    console.error("Error loading server templates:", err);
    return [];
  }
}
