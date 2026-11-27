// Ported from the Legal app (family-law-floater/src/components/firms/FirmCallRecording.tsx). Re-run the port script to refresh.
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getFirmRecording } from "@/legal/lib/firm-recording.functions";

export function FirmCallRecording({
  applicationId,
  callId,
  filename,
}: {
  applicationId: string;
  callId: string;
  filename: string;
}) {
  const get = useServerFn(getFirmRecording);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lifetime = useRef<{ active: boolean; url: string | null }>({ active: true, url: null });
  useEffect(() => {
    const current = { active: true, url: null as string | null };
    lifetime.current = current;
    return () => {
      current.active = false;
      if (current.url) URL.revokeObjectURL(current.url);
    };
  }, []);

  const load = async () => {
    if (loading) return;
    const current = lifetime.current;
    setLoading(true);
    setError(false);
    try {
      const response = await get({ data: { applicationId, callId } });
      if (!response.ok) throw new Error("Recording unavailable");
      const blob = await response.blob();
      if (!blob.size) throw new Error("Empty recording");
      if (!current.active) return;
      if (current.url) URL.revokeObjectURL(current.url);
      current.url = URL.createObjectURL(blob);
      setSource(current.url);
    } catch {
      if (current.active) setError(true);
    } finally {
      if (current.active) setLoading(false);
    }
  };

  return (
    <div className="my-2 space-y-2">
      {source ? (
        <>
          <audio
            controls
            preload="metadata"
            src={source}
            aria-label="Firm call recording"
            className="h-10 w-full"
          />
          <a href={source} download={filename} className="text-sm font-medium underline">
            Download MP3
          </a>
        </>
      ) : (
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="text-sm font-medium underline disabled:opacity-50"
        >
          {loading ? "Loading recording…" : error ? "Retry recording" : "Load recording"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t load the recording. Please try again.
        </p>
      )}
    </div>
  );
}
