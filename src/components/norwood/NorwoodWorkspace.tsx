import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Move one portal container, never remount the camera or an in-flight capture.
 * A native modal supplies top-layer placement, focus trapping and outside inertness
 * based on the DOM (the portal's React ancestors stay in the call screen). */
export default function NorwoodWorkspace({ expanded, onExpandedChange, returnFocus, children }: {
  expanded: boolean; onExpandedChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLButtonElement | null>; children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const inline = useRef<HTMLDivElement>(null), modal = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId(), description = useId();
  useEffect(() => {
    const element = document.createElement('div');
    setContainer(element);
    return () => element.remove();
  }, []);
  useLayoutEffect(() => {
    if (!container || !inline.current || !modal.current || !dialog.current) return;
    const element = dialog.current;
    const host = expanded ? modal.current : inline.current;
    if (container.parentElement !== host) host.appendChild(container);
    if (!expanded) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')).filter(node => node.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    element.addEventListener('keydown', trapTab);
    returnFocus.current?.focus();
    // Reparenting can pause media in some browsers; keep the existing stream playing.
    container.querySelectorAll('video').forEach(video => {
      if (video.srcObject && video.autoplay) void video.play().catch(() => {});
    });
    return () => {
      inline.current?.appendChild(container);
      element.removeEventListener('keydown', trapTab);
      element.close();
      document.body.style.overflow = overflow;
      returnFocus.current?.focus();
      container.querySelectorAll('video').forEach(video => {
        if (video.srcObject && video.autoplay) void video.play().catch(() => {});
      });
    };
  }, [container, expanded, returnFocus]);
  return <>
    <div ref={inline} />
    {expanded && <p className="nw-workspace-placeholder">Camera and chart are open in the expanded view.</p>}
    <dialog ref={dialog} className="nw-workspace-dialog" aria-labelledby={title} aria-describedby={description}
      onCancel={event => { event.preventDefault(); onExpandedChange(false); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onExpandedChange(false);
      }}>
      <h2 id={title} className="sr-only">AI Norwood photo check — expanded view</h2>
      <p id={description} className="sr-only">Guide the patient camera or review saved photos, then compare the Norwood reference chart. Return to the call form to confirm the final stage.</p>
      <div ref={modal} />
      <button type="button" className="nw-workspace-close" aria-label="Close expanded view" onClick={() => onExpandedChange(false)}><X size={18} /></button>
    </dialog>
    {container && createPortal(children, container)}
  </>;
}
