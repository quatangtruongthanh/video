import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file video." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}.bin`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.mp4`);

    await fs.promises.writeFile(inputPath, buffer);

    // Chuyển đổi sang chuẩn QuickTime: H.264 (High profile, yuv420p) + AAC audio + faststart
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i",
        inputPath,
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "ultrafast",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputPath,
      ]);

      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });

      ffmpeg.on("error", (err) => reject(err));
    });

    const outBuffer = await fs.promises.readFile(outputPath);

    // Dọn dẹp file tạm
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});

    return new NextResponse(outBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="video.mp4"',
      },
    });
  } catch (err: unknown) {
    console.error("Transcode Error:", err);
    return NextResponse.json(
      { error: "Lỗi chuyển đổi video: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}
