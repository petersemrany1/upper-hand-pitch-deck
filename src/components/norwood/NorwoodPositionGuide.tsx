import type { NorwoodView } from "@/lib/norwood-assessment";

export const HAIR_POSITIONS: Record<NorwoodView, { title: string; instruction: string; live: string }> = {
  front: { title: "Show your hairline", instruction: "Push hair back. Hold the phone just above your eyes.", live: "Keep your whole hairline in the picture." },
  top: { title: "Show the top", instruction: "Phone above your forehead. Lower your chin.", live: "After tapping, lift the phone and look down." },
  crown: { title: "Show the crown", instruction: "Phone above your head, screen down. Chin to chest.", live: "After tapping, lift the phone and tuck your chin." },
  left: { title: "Show your left side", instruction: "Keep the phone in front. Turn your nose to your right.", live: "Keep your left ear and temple in the picture." },
  right: { title: "Show your right side", instruction: "Keep the phone in front. Turn your nose to your left.", live: "Keep your right ear and temple in the picture." },
};

/** Original instructional artwork. One large pose, rather than two tiny diagrams. */
export default function NorwoodPositionGuide({ view }: { view: NorwoodView }) {
  const overhead = view === "top" || view === "crown";
  const side = view === "left" || view === "right";
  return <svg className="nw-position-art" viewBox="0 0 320 285" role="img" aria-label={HAIR_POSITIONS[view].instruction}>
    <defs><linearGradient id={`nw-bg-${view}`} x2="0" y2="1"><stop stopColor="#f3f5ed"/><stop offset="1" stopColor="#e7ede2"/></linearGradient></defs>
    <rect width="320" height="285" rx="20" fill={`url(#nw-bg-${view})`}/>
    {overhead ? <g stroke="#244a40" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M44 285 Q43 217 87 211 Q141 204 169 285" fill="#d0dbcf"/>
      <path d="M87 232 L93 187 L125 183 L132 225" fill="#e9cdb2"/>
      <g transform={`rotate(${view === "crown" ? 76 : 42} 112 172)`}>
        <path d="M81 185 Q58 147 77 113 Q101 83 133 104 Q154 115 154 143 L169 159 L154 164 L153 185 Q139 199 123 187 L124 211" fill="#edd5be"/>
        <path d="M75 149 Q57 103 95 94 Q138 85 154 121 L133 117 L119 136 L101 126 L92 159" fill="#627d6a"/>
        <path d="M105 157 Q90 146 92 167 Q94 176 105 169" fill="#edd5be"/>
        <path d="M144 142h2 M144 181h9"/>
        <path d={view === "crown" ? "M75 142 Q65 110 91 100" : "M91 100 Q131 90 150 117"} fill="none" stroke="#c4d9a1" strokeWidth="12"/>
      </g>
      <path d={view === "crown" ? "M73 253 Q218 280 201 63" : "M73 253 Q239 275 239 88"} fill="none" stroke="#d9b999" strokeWidth="15"/>
      <g transform={view === "crown" ? "translate(201 49) rotate(-77)" : "translate(239 74) rotate(-45)"}>
        <path d="M-7 -24 L-76 -34 L-65 59 L-7 24Z" fill="#acc38b33" stroke="none"/>
        <rect x="-10" y="-31" width="21" height="62" rx="6" fill="#244a40"/>
        <path d="M-7 -22v44" stroke="#d9e8c7" strokeWidth="3"/><circle cx="-6" cy="-24" r="2" fill="#fff" stroke="none"/>
      </g>
      <path d={view === "crown" ? "M116 28h40l26 18" : "M130 36h43l38 29"} fill="none" stroke="#8a9e7b" strokeWidth="1.5"/>
      <text x={view === "crown" ? 39 : 49} y={view === "crown" ? 32 : 40} fill="#405c4e" stroke="none" fontSize="15" fontWeight="600">Phone here</text>
      <path d="M247 153q-2 29-20 41m-1-13 1 13 14-2" fill="none" stroke="#8b9f72" strokeWidth="3"/>
    </g> : side ? <g stroke="#244a40" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" transform={view === "right" ? "translate(320 0) scale(-1 1)" : undefined}>
      <path d="M43 285 Q51 221 99 216 L99 186 L136 185 L137 215 Q181 223 193 285" fill="#d0dbcf"/>
      <path d="M99 217 L99 187 Q77 159 80 111 Q84 70 120 65 Q162 62 174 101 L176 127 L190 144 L176 151 L175 176 Q164 191 137 184 L137 218" fill="#edd5be"/>
      <path d="M82 139 Q66 90 102 63 Q146 39 173 90 L151 91 L136 119 L114 106 L103 148" fill="#627d6a"/>
      <path d="M121 149 Q103 131 102 156 Q103 177 120 168" fill="#edd5be"/>
      <path d="M158 125h5 M162 170h12" fill="none"/>
      <path d="M153 92 L139 115" stroke="#c4d9a1" strokeWidth="11"/>
      <rect x="247" y="93" width="23" height="63" rx="6" fill="#244a40"/>
      <path d="M251 101v47" stroke="#d9e8c7"/>
      <path d="M244 101 L182 77 M244 151 L192 185" stroke="#9ab184" strokeDasharray="4 5" strokeWidth="1.5"/>
      <path d="M151 253 Q242 264 255 162" fill="none" stroke="#d9b999" strokeWidth="14"/>
      <path d="M87 36 Q123 19 157 39m-15-1 15 1-6-13" fill="none" stroke="#8b9f72" strokeWidth="3"/>
    </g> : <g stroke="#244a40" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M43 285 Q52 220 108 213 L109 190 H168 L169 214 Q211 225 215 285" fill="#d0dbcf"/>
      <path d="M89 116 Q78 60 137 56 Q198 58 186 119 L187 157 Q177 201 138 211 Q97 201 88 157Z" fill="#edd5be"/>
      <path d="M88 122 Q72 65 117 51 Q170 35 188 78 L188 121 L173 100 L155 109 L138 100 L121 109 L102 101Z" fill="#627d6a"/>
      <path d="M89 122 L102 101 L121 109 L138 100 L155 109 L173 100 L187 122" fill="none" stroke="#c4d9a1" strokeWidth="9"/>
      <path d="M104 144h13 M159 144h13 M137 149l-4 23h8 M124 187q14 5 28 0" fill="none"/>
      <path d="M183 250 Q263 264 258 121" fill="none" stroke="#d9b999" strokeWidth="14"/>
      <rect x="244" y="50" width="27" height="70" rx="7" fill="#244a40"/>
      <path d="M248 59v51" stroke="#d9e8c7"/><circle cx="248" cy="55" r="2" fill="#fff" stroke="none"/>
      <path d="M239 56 L194 61 M239 112 L194 145" stroke="#9ab184" strokeDasharray="4 5" strokeWidth="1.5"/>
      <path d="M42 77L65 83" stroke="#8a9e7b" strokeWidth="1.5"/><text x="25" y="62" stroke="none" fill="#405c4e" fontSize="14" fontWeight="600">Hair back</text>
    </g>}
    <rect x="83" y="260" width="154" height="25" rx="12" fill="#e7ede2"/>
    <circle cx="101" cy="272" r="5" fill="#abc480"/>
    <text x="113" y="277" fontSize="12" fontWeight="500" fill="#49604d">Area we need to see</text>
  </svg>;
}
