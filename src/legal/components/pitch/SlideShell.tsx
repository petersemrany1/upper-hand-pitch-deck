// Ported from the Legal app (family-law-floater/src/components/pitch/SlideShell.tsx). Re-run the port script to refresh.
import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { DeckLines } from "./DeckLines";
import { SlideHeader } from "./SlideHeader";

export const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function ChapterLabel({ children }: { children: ReactNode }) {
  return (
    <motion.p variants={item} className="deck-chapter">
      {children}
    </motion.p>
  );
}

export function SlideHeading({ children }: { children: ReactNode }) {
  return (
    <motion.h2 variants={item} className="deck-heading">
      {children}
    </motion.h2>
  );
}

export function Slide({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="visible"
      className={`deck-slide ${className}`}
    >
      <DeckLines />
      <SlideHeader />
      <div className="deck-slide-content">{children}</div>
    </motion.section>
  );
}
