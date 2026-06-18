import { UploadForm } from "@/components/upload-form";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Distributed Video Moderation
        </h1>
        <p className="text-slate-500 max-w-md">
          Upload a video and our distributed pipeline will check it across three
          safety pillars: Adult Content, AI/Deepfake, and Copyright.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
