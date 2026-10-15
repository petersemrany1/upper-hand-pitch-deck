import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import PatientNorwoodCapture from "@/components/norwood/PatientNorwoodCapture";
import { isNorwoodPreviewHost } from "@/lib/norwood-preview-access";
import { checkPatientNorwoodFrame, openPatientNorwood, consentPatientNorwood, uploadPatientNorwood, analysePatientNorwood } from "@/utils/norwood-sandbox.functions";

const api = { checkPatientNorwoodFrame, openPatientNorwood, consentPatientNorwood, uploadPatientNorwood, analysePatientNorwood };
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
  if (!link.allowed) return <main className="nw-page">Please open the private link your advisor sent you.</main>;
  return <PatientNorwoodCapture api={api} linkToken={link.token} mode="private" />;
}
