import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export interface SubtitleWord {
  text: string;
  startSec: number;
  endSec: number;
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "vi-VN-HoaiMyNeural", rate = 0, pitch = 0 } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Văn bản không được để trống." }, { status: 400 });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true,
    });

    // Patch websocket onclose của msedge-tts để ngăn không cho stream.audio.destroy ném unhandled error
    // khi websocket đóng sau khi đã truyền audio
    const ws = (tts as unknown as { _ws?: { onclose?: () => void } })._ws;
    if (ws) {
      const origOnClose = ws.onclose;
      ws.onclose = () => {
        const streams = (tts as unknown as { _streams?: Record<string, { turnEnded: boolean; audio: { push: (data: unknown) => void } }> })._streams;
        if (streams) {
          for (const reqId in streams) {
            // Đánh dấu turnEnded = true để thư viện chỉ push(null) đóng stream tự nhiên
            // thay vì ném Error: Stream closed before the synthesis completed
            streams[reqId].turnEnded = true;
          }
        }
        if (origOnClose) origOnClose();
      };
    }

    const rateStr = rate >= 0 ? `+${rate}%` : `${rate}%`;
    const pitchStr = pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;

    const { audioStream, metadataStream } = tts.toStream(text, {
      rate: rateStr,
      pitch: pitchStr,
    });

    const audioChunks: Buffer[] = [];
    const rawWords: SubtitleWord[] = [];

    if (metadataStream) {
      metadataStream.on("data", (chunk: Buffer) => {
        try {
          const parsed = JSON.parse(chunk.toString());
          const metaList = parsed.Metadata || [];
          for (const item of metaList) {
            if (item.Type === "WordBoundary" && item.Data?.text?.Text) {
              const startSec = (item.Data.Offset || 0) / 10000000;
              const durationSec = (item.Data.Duration || 0) / 10000000;
              rawWords.push({
                text: item.Data.text.Text,
                startSec: Number(startSec.toFixed(3)),
                endSec: Number((startSec + durationSec).toFixed(3)),
              });
            }
          }
        } catch {
          // ignore
        }
      });
      metadataStream.on("error", () => {});
    }

    await new Promise<void>((resolve, reject) => {
      let isSettled = false;

      audioStream.on("data", (chunk: Buffer) => {
        audioChunks.push(chunk);
      });

      audioStream.on("end", () => {
        if (!isSettled) {
          isSettled = true;
          resolve();
        }
      });

      audioStream.on("error", (err: Error) => {
        if (audioChunks.length > 0 && Buffer.concat(audioChunks).length > 1024) {
          if (!isSettled) {
            isSettled = true;
            resolve();
          }
        } else {
          if (!isSettled) {
            isSettled = true;
            reject(err);
          }
        }
      });
    });

    const fullBuffer = Buffer.concat(audioChunks);
    const audioBase64 = fullBuffer.toString("base64");

    return NextResponse.json({
      audioBase64: `data:audio/mp3;base64,${audioBase64}`,
      subtitles: rawWords,
    });
  } catch (error: unknown) {
    console.error("TTS generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi khi tạo giọng nói TTS" },
      { status: 500 }
    );
  }
}
