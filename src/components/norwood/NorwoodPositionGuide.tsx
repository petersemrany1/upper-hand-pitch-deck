import type { NorwoodView } from "@/lib/norwood-assessment";

export const HAIR_POSITIONS: Record<NorwoodView, { title: string; instruction: string; live: string }> = {
  front: { title: "Push your hair back", instruction: "Leave space above your head in the picture.", live: "Hair back. Hold for 2 seconds, then tap Done." },
  top: { title: "Lower your head", instruction: "Keep the phone still. Copy the movement below.", live: "Head down for 2 seconds. Look up and tap Done." },
  crown: { title: "Lean forward, head down", instruction: "Keep the phone still. Move only as far as comfortable.", live: "Hold for 2 seconds. Sit up and tap Done." },
  left: { title: "Turn your nose right", instruction: "Keep the phone still. Show your ear and hairline.", live: "Hold for 2 seconds. Face the screen and tap Done." },
  right: { title: "Turn your nose left", instruction: "Keep the phone still. Show your ear and hairline.", live: "Hold for 2 seconds. Face the screen and tap Done." },
};

/** Original, silent movement demonstration. The phone never travels over the head. */
export default function NorwoodPositionGuide({ view, setup = false }: { view: NorwoodView; setup?: boolean }) {
  const bow = !setup && (view === "top" || view === "crown");
  const side = !setup && (view === "left" || view === "right");
  return <svg className={`nw-position-art ${bow ? `nw-demo-${view}` : ""}`} viewBox="0 0 340 330" role="img" aria-label={setup ? "Sit facing a phone supported on books, with its screen at eye level." : HAIR_POSITIONS[view].instruction}>
    <defs>
      <linearGradient id={`skin-${view}`}><stop stopColor="#edd1b4"/><stop offset="1" stopColor="#d7af8b"/></linearGradient>
      <radialGradient id={`hair-${view}`}><stop stopColor="#7a8270"/><stop offset="1" stopColor="#435749"/></radialGradient>
    </defs>
    <rect width="340" height="330" rx="22" fill="#eef1e7"/>
    {setup || bow ? <g stroke="#35564b" strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round">
      <path d="M16 291H329 M290 291v39" stroke="#a3b09b"/>
      <rect x="260" y="264" width="60" height="26" rx="3" fill="#b6c6ad"/>
      <rect x="255" y="247" width="68" height="17" rx="3" fill="#e1dbb9"/>
      <rect x="263" y="226" width="52" height="21" rx="3" fill="#c5d3b9"/>
      <path d="M277 226l25-58 13 58" fill="#b0beab" stroke="#7e9380"/>
      <rect x="274" y="132" width="20" height="92" rx="6" fill="#264d42"/>
      <path d="M278 142v71" stroke="#e9efd9" strokeWidth="3"/>
      <circle cx="278" cy="139" r="2" fill="white" stroke="none"/>
      <path d="M271 136L199 105M271 220L200 263" stroke="#9eae90" strokeDasharray="4 6" strokeWidth="1.3"/>
      <g className="nw-demo-body">
        <path d="M43 330L43 268Q44 227 87 222Q118 220 130 258L135 330" fill="#cbd8c8"/>
        <g className="nw-demo-head">
          <path d="M74 233L75 204Q46 187 48 148Q47 104 80 94Q116 82 139 112Q146 124 145 143L158 161L143 169L142 190Q133 205 107 202L108 236" fill={`url(#skin-${view})`}/>
          <path d="M49 158Q35 111 66 91Q110 68 139 106L144 126L121 117L108 136L91 125L80 167" fill={`url(#hair-${view})`}/>
          <path d="M93 168Q76 152 75 173Q75 192 91 185" fill="#e3bd9b"/>
          <path d="M128 144h5M129 186h12" fill="none"/>
          {bow && <path d={view === "crown" ? "M47 141Q42 108 65 93" : "M64 93Q107 71 136 109"} fill="none" stroke="#c6d68e" strokeWidth="10"/>}
        </g>
        <path d="M89 255L125 290H211" fill="none" stroke="#ddba98" strokeWidth="16"/>
      </g>
      <text x="217" y="67" fontSize="15" fontWeight="600" stroke="none" fill="#4b6555">Phone stays here</text>
      <path d="M276 78v38m-5-6 5 6 5-6" fill="none" stroke="#7f9472"/>
      {bow && <path d="M156 85Q209 111 202 158m-8-12 8 12 10-10" fill="none" stroke="#8b9e6e" strokeWidth="4"/>}
    </g> : side ? <g transform={view === "right" ? "translate(340 0) scale(-1 1)" : undefined} stroke="#35564b" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M64 330Q68 270 124 256L124 226L172 223L173 256Q228 267 243 330" fill="#cbd8c8"/>
      <path d="M125 256L125 226Q88 200 90 146Q89 83 140 65Q188 46 216 87Q228 106 224 135L241 157L223 168L220 199Q209 224 173 223L173 256" fill={`url(#skin-${view})`}/>
      <path d="M91 162Q72 88 118 63Q179 28 214 77L225 113L195 99L177 132L147 115L127 178" fill={`url(#hair-${view})`}/>
      <path d="M157 175Q133 153 129 179Q127 208 151 196" fill="#e3bd9b"/>
      <path d="M204 139h6M206 195h13"/>
      <path d="M193 101L179 128" stroke="#c6d68e" strokeWidth="12"/>
      <path className="nw-demo-turn" d="M109 36Q170 9 218 37m-15-1 15 1-6-15" fill="none" stroke="#8b9e6e" strokeWidth="4"/>
    </g> : <g stroke="#35564b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M55 330Q64 276 133 258L133 239H208L208 259Q271 278 281 330" fill="#cbd8c8"/>
      <path d="M104 116Q92 53 170 47Q247 50 236 117L236 191Q221 251 170 263Q117 250 104 191Z" fill={`url(#skin-${view})`}/>
      <path d="M104 133Q79 62 138 43Q200 17 237 76L238 133L216 101L193 111L170 99L147 111L124 101Z" fill={`url(#hair-${view})`}/>
      <path d="M104 133L124 101L147 111L170 99L193 111L216 101L237 133" fill="none" stroke="#c6d68e" strokeWidth="9"/>
      <path d="M125 167h16M198 167h16M170 174l-5 29h10M154 229q16 6 32 0" fill="none"/>
      <path d="M60 132V71h23M279 132V71h-23" stroke="#99ad85" strokeWidth="3" fill="none"/>
      <text x="170" y="301" textAnchor="middle" fontSize="16" fontWeight="600" stroke="none" fill="#4b6555">Both corners of your hairline</text>
    </g>}
  </svg>;
}
