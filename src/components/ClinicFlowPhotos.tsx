import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, Trash2, Loader2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listClinicflowPhotos,
  addClinicflowPhoto,
  deleteClinicflowPhoto,
} from "@/lib/clinicflow-phase4.functions";

const NAVY = "#1a3a6b";
const GREY = "#6b7785";
const LINE = "#e2e6ec";

export const STAGES: { key: string; label: string }[] = [
  { key: "day_1", label: "Day 1" },
  { key: "week_1_2", label: "Week 1–2" },
  { key: "weeks_2_4", label: "Weeks 2–4 (shedding)" },
  { key: "month_3", label: "Month 3" },
  { key: "month_6", label: "Month 6" },
  { key: "month_12", label: "Month 12" },
];

type Photo = {
  id: string;
  stage: string;
  url: string;
  caption: string | null;
  signed_url: string | null;
};

export function ClinicFlowPhotos({ clinicId }: { clinicId: string }) {
  const listFn = useServerFn(listClinicflowPhotos);
  const addFn = useServerFn(addClinicflowPhoto);
  const delFn = useServerFn(deleteClinicflowPhoto);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingStage, setUploadingStage] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { photos: rows } = await listFn({ data: { clinicId } });
      setPhotos(rows as Photo[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load photos");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [clinicId]);

  const upload = async (stage: string, file: File) => {
    setUploadingStage(stage);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${clinicId}/${stage}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("clinicflow-photos").upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      await addFn({ data: { clinicId, stage, url: path } });
      toast.success("Photo added");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploadingStage(null); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    try {
      await delFn({ data: { photoId: id } });
      setPhotos((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const baPhotos = photos.filter((p) => p.stage === BEFORE_AFTER);
  const baFull = baPhotos.length >= 10;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Before & after */}
      <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>Before &amp; after</div>
            <div style={{ color: GREY, fontSize: 12, marginTop: 2 }}>
              Your 10 best results. These are what you show patients in the consult.
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: GREY, fontSize: 12, marginBottom: 6 }}>{baPhotos.length} of 10</div>
            <input
              ref={(el) => { fileRefs.current[BEFORE_AFTER] = el; }}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(BEFORE_AFTER, f);
                if (fileRefs.current[BEFORE_AFTER]) fileRefs.current[BEFORE_AFTER]!.value = "";
              }}
            />
            {baFull ? (
              <div style={{ color: GREY, fontSize: 12, maxWidth: 200 }}>10 photo limit — delete one to add another.</div>
            ) : (
              <button
                onClick={() => fileRefs.current[BEFORE_AFTER]?.click()}
                disabled={uploadingStage === BEFORE_AFTER}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: NAVY, color: "#fff", border: "none", padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                {uploadingStage === BEFORE_AFTER ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <div style={{ color: GREY, fontSize: 12 }}>Loading…</div>
        ) : baPhotos.length === 0 ? (
          <div style={{ color: GREY, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><ImagePlus size={14} /> No before &amp; after photos yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
            {baPhotos.map((p) => (
              <div key={p.id} style={{ position: "relative", aspectRatio: "1", background: "#f1f5f9", borderRadius: 8, overflow: "hidden" }}>
                {p.signed_url && <img src={p.signed_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                <button
                  onClick={() => void remove(p.id)}
                  title="Delete"
                  style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 6, padding: 5, cursor: "pointer", display: "flex" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>Timeline photos</div>

      {loading ? (
        <div style={{ color: GREY, fontSize: 13 }}><Loader2 size={14} className="animate-spin" style={{ verticalAlign: "middle" }} /> Loading photos…</div>
      ) : (

        STAGES.map((s) => {
          const stagePhotos = photos.filter((p) => p.stage === s.key);
          return (
            <div key={s.key} style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>{s.label}</div>
                <div>
                  <input
                    ref={(el) => { fileRefs.current[s.key] = el; }}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(s.key, f);
                      if (fileRefs.current[s.key]) fileRefs.current[s.key]!.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileRefs.current[s.key]?.click()}
                    disabled={uploadingStage === s.key}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: NAVY, color: "#fff", border: "none", padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                  >
                    {uploadingStage === s.key ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload
                  </button>
                </div>
              </div>
              {stagePhotos.length === 0 ? (
                <div style={{ color: GREY, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}><ImagePlus size={14} /> No photos yet.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                  {stagePhotos.map((p) => (
                    <div key={p.id} style={{ position: "relative", aspectRatio: "1", background: "#f1f5f9", borderRadius: 8, overflow: "hidden" }}>
                      {p.signed_url && <img src={p.signed_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      <button
                        onClick={() => void remove(p.id)}
                        title="Delete"
                        style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 6, padding: 5, cursor: "pointer", display: "flex" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
