import type { NorwoodView } from "@/lib/norwood-assessment";

export const CAPTURE_STEPS = {
  front: { title: "Front hairline", move: "Phone in front. Push your hair back.", target: "Hairline + both temples" },
  top: { title: "Top of your head", move: "Lift the phone above your forehead, pointing down. Look down.", target: "Hairline + middle of scalp" },
  crown: { title: "Back of the top · crown", move: "Lift the phone above your head, pointing down. Chin to chest.", target: "Crown + hair below it" },
  left: { title: "Left side", move: "Phone in front. Turn your nose to your right.", target: "Left temple + ear" },
  right: { title: "Right side", move: "Phone in front. Turn your nose to your left.", target: "Right temple + ear" },
} as const;

// Two distinct illustrations: where to hold the phone, and the region the photo
// must contain. Highlighting the scalp avoids a generic face-shaped selfie guide.
export default function NorwoodPoseGuide({ view, large = false }: { view: NorwoodView; large?: boolean }) {
  const overhead = view === "top" || view === "crown", side = view === "left" || view === "right";
  return <div className={`nw-pose ${large ? "nw-pose-large" : ""}`}>
    <div><span>{overhead ? "Phone above head" : "Phone in front"}</span><svg viewBox="0 0 160 112" role="img" aria-label={CAPTURE_STEPS[view].move}>
      <g stroke="#345b50" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M18 108 Q22 75 55 76 Q85 76 92 108" fill="#dce6dd" />
        <g transform={overhead ? (view === "crown" ? "rotate(80 55 55)" : "rotate(48 55 55)") : undefined}>
          <path d="M35 76 L35 61 Q18 43 31 24 Q47 8 67 19 Q78 26 78 39 L86 48 L77 52 L77 65 Q71 71 60 66 L60 79" fill="#f2d9bd" />
          <path d="M28 39 Q22 20 43 15 Q66 9 77 30 L64 26 L57 38 L45 29 L39 49" fill="#658270" />
          <circle cx="70" cy="38" r="1.3" fill="#345b50" /><path d="M44 46 Q36 38 38 50 Q39 55 45 53" fill="none" />
        </g>
        <path d={overhead ? "M37 96 Q108 107 125 45" : "M37 96 Q100 104 121 57"} fill="none" stroke="#e1c5a5" strokeWidth="9" /><g transform={overhead ? "translate(0 -15) rotate(-25 124 45)" : undefined}><rect x="114" y="25" width="21" height="40" rx="4" fill="#345b50" /><path d="M117 32 V57" stroke="#e5f2d5" /><path d="M111 30 L81 21 M111 58 L82 70" stroke="#8cae75" strokeDasharray="3 4" /></g>
        {side && <path d="M32 9 Q59 -1 77 9 M70 2 L77 9 L67 13" fill="none" stroke="#648947" />}
      </g>
    </svg></div>
    <div><span>Show this area</span><svg viewBox="0 0 160 112" role="img" aria-label={CAPTURE_STEPS[view].target}>
      <g stroke="#345b50" strokeWidth="2" strokeLinejoin="round" fill="#f2d9bd" transform={view === "right" ? "translate(160 0) scale(-1 1)" : undefined}>
        {overhead ? <><ellipse cx="80" cy="57" rx="38" ry="47" fill="#c7d8bd" /><path d="M40 53 Q30 46 34 61 L42 66 M120 53 Q130 46 126 61 L118 66" /><path d="M70 101 L80 110 L90 101" /><ellipse cx="80" cy={view === "crown" ? "39" : "65"} rx="28" ry={view === "crown" ? "24" : "32"} fill="#e7f0ba" stroke="#5f823c" strokeWidth="3" strokeDasharray="4 3" />{view === "crown" ? <path d="M80 30 Q96 32 88 44 Q75 51 72 39 Q70 32 80 35" fill="none" /> : <path d="M54 87 Q80 76 106 87" fill="none" />}</>
          : side ? <><path d="M46 108 L45 77 Q27 48 44 22 Q63 1 92 15 Q113 21 114 43 L126 55 L113 61 L111 79 Q105 88 85 84 L85 108" /><path d="M40 52 Q25 19 60 10 Q91 1 111 29 L94 28 L83 47 L65 40 L57 65" fill="#c7d8bd" /><path d="M68 59 Q53 49 55 68 Q57 78 68 74" fill="none" /><path d="M84 29 L104 28 L107 46 L91 52 L78 47 Z" fill="#e7f0ba" stroke="#5f823c" strokeWidth="3" strokeDasharray="3 3" /></>
            : <><path d="M44 40 Q42 4 80 4 Q118 4 116 40 L117 65 Q111 99 80 104 Q49 99 43 65 Z" /><path d="M44 43 Q43 8 80 7 Q117 8 116 43 L102 33 L91 38 L80 32 L69 38 L58 33 Z" fill="#c7d8bd" /><path d="M45 43 L58 33 L69 38 L80 32 L91 38 L102 33 L115 43" fill="none" stroke="#719349" strokeWidth="9" /><path d="M59 60 H69 M91 60 H101 M79 65 L76 79 L83 79 M70 90 Q80 94 90 90" fill="none" /></>}
      </g>
    </svg></div>
  </div>;
}
