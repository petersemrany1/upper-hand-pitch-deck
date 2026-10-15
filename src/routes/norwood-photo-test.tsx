import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import PatientNorwoodCapture from "@/components/norwood/PatientNorwoodCapture";
import { isNorwoodPreviewHost } from "@/lib/norwood-preview-access";
import { openPatientNorwood, consentPatientNorwood, uploadPatientNorwood, analysePatientNorwood } from "@/utils/norwood-sandbox.functions";

const api = { openPatientNorwood, consentPatientNorwood, uploadPatientNorwood, analysePatientNorwood };
export const Route = createFileRoute("/norwood-photo-test")({
  head: () => ({ meta: [{ title: "Your guided hair photos" }, { name: "robots", content: "noindex, nofollow, noarchive" }, { name: "referrer", content: "no-referrer" }] }),
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
  if (!link.allowed) return <main className="nw-page">This photo test is available only in the preview.</main>;
  return <PatientNorwoodCapture api={api} linkToken={link.token} mode="private" />;
}
