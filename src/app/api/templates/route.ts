import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface TemplateItem {
  id: string;
  name: string;
  filename: string;
  url: string;
  sizeBytes: number;
}

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public/templates");
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ templates: [] });
    }

    const files = fs
      .readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith(".mp4"))
      .sort();

    const templates: TemplateItem[] = files.map((file) => {
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

    return NextResponse.json({ templates });
  } catch (err: unknown) {
    console.error("Error reading templates:", err);
    return NextResponse.json({ templates: [] }, { status: 500 });
  }
}
