"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadVideo } from "@/lib/api";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadVideo(file);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Upload Video for Moderation</CardTitle>
        <p className="text-sm text-slate-500">
          The video will be checked against Adult Content, AI/Deepfake, and
          Copyright pillars asynchronously.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-10 cursor-pointer hover:border-slate-400 transition-colors"
          >
            <Upload className="h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-600">
              {file ? file.name : "Click to select a video file"}
            </p>
            {file && (
              <p className="text-xs text-slate-400">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/*,.mp4,.mov,.avi,.mkv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {error && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!file || uploading}
          >
            {uploading ? "Uploading…" : "Submit for Moderation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
