import { HAIR_PROFILE_SHARE_IMAGE } from '@/lib/norwood-share-meta';
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import PatientNorwoodCapture from "@/components/norwood/PatientNorwoodCapture";
import { isNorwoodPreviewHost } from "@/lib/norwood-preview-access";
import { capturePatientNorwoodFrame, selectPatientNorwoodFrames, checkPatientNorwoodFrame, openPatientNorwood, consentPatientNorwood, uploadPatientNorwood, analysePatientNorwood } from "@/utils/norwood-sandbox.functions";

import { patientNorwoodLive } from '@/utils/norwood-live.functions';

const api = { liveCamera: patientNorwoodLive, capturePatientNorwoodFrame, selectPatientNorwoodFrames, checkPatientNorwoodFrame, openPatientNorwood, consentPatientNorwood, uploadPatientNorwood, analysePatientNorwood };
export const Route = createFileRoute("/norwood-photo-test")({
  head: () => ({ meta: [{ title: "Hair Profile · Your private assessment" }, { property: "og:title", content: "Hair Profile" }, { property: "og:description", content: "Your private, guided hair assessment." }, { property: "og:image", content: HAIR_PROFILE_SHARE_IMAGE }, { name: "twitter:title", content: "Hair Profile" }, { name: "twitter:description", content: "Your private, guided hair assessment." }, { name: "twitter:image", content: HAIR_PROFILE_SHARE_IMAGE }, { name: "robots", content: "noindex, nofollow, noarchive" }, { name: "referrer", content: "no-referrer" }] }),
  component: PatientPhotoTest,
});
function PatientPhotoTest() {
  const [link, setLink] = useState<{ allowed: boolean; token: string } | null>(null);
  useEffect(() => {
    const read = () => setLink({ allowed: isNorwoodPreviewHost(window.location.hostname), token: window.location.hash.slice(1) });
    read(); window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  if (!link) return <main className="nw-page">Opening your photo link…</main>;
  if (!link.allowed) return <main className="nw-page">Please open the private link your advisor sent you.</main>;
  return <PatientNorwoodCapture api={api} linkToken={link.token} mode="private" />;
}
