import { useId } from 'react';

// Original schematic illustrations, not reproduced clinical photographs.
// Definitions checked against Norwood's classification as described by
// consultant surgeon Maurice Collins: https://www.hrbr.ie/hair-classification/
// and Gupta & Mysore (2016): https://pmc.ncbi.nlm.nih.gov/articles/PMC4812885/
const STAGES = [
  { number: 1, name: 'Little or no recession', description: 'The hairline has little or no recession, with no distinct crown loss.' },
  { number: 2, name: 'Mild temple recession', description: 'The hairline recedes slightly at both temples, while the crown stays covered.' },
  { number: 3, name: 'Deep temple recession', description: 'The temples recede deeply, leaving bare or very sparse corners of the hairline.' },
  { number: 4, name: 'Two separate areas', description: 'Front and crown loss are separated by a clear band of hair across the top.' },
  { number: 5, name: 'A narrowing hair band', description: 'Front and crown loss expand, leaving a narrower, thinner band between them.' },
  { number: 6, name: 'Front and crown join', description: 'The separating band is lost, joining the front and crown into one area.' },
  { number: 7, name: 'A narrow horseshoe', description: 'Only a narrow horseshoe of hair remains low around the sides and back.' },
] as const;

function Scalp({ stage, vertex = false }: { stage: number; vertex?: boolean }) {
  const clip = useId();
  const skin = '#efd9c2';
  // Top view, nose/front above and crown below; a consistent head shape makes
  // the IV/V bridge and VI/VII side/back fringe differences easy to compare.
  const fronts: Record<number, string> = {
    1: 'M15 0H125V50 Q112 31 99 40 Q70 30 41 40 Q28 31 15 50Z',
    2: 'M15 0H125V50 Q111 37 99 60 Q88 64 83 43 Q70 36 57 43 Q52 64 41 60 Q29 37 15 50Z',
    3: 'M15 0H125V52 Q110 43 102 81 Q92 87 83 49 Q70 41 57 49 Q48 87 38 81 Q30 43 15 52Z',
    4: 'M15 0H125V60 Q110 55 103 87 Q90 92 83 61 Q70 51 57 61 Q50 92 37 87 Q30 55 15 60Z',
    5: 'M15 0H125V64 Q109 59 102 91 Q91 93 83 76 Q70 65 57 76 Q49 93 38 91 Q31 59 15 64Z',
    6: 'M15 0H125V55 L104 61 C109 85 108 113 95 126 Q70 143 45 126 C32 113 31 85 36 61 L15 55Z',
    7: 'M15 0H125V57 L111 63 C117 91 115 120 101 134 Q70 153 39 134 C25 120 23 91 29 63 L15 57Z',
  };
  return <svg viewBox="0 0 140 164" role="img" aria-label={`Norwood ${stage}${vertex ? ' vertex variant: crown loss with no more than stage 3 front recession' : `: ${STAGES[stage - 1].name}`}`}>
    <defs><clipPath id={clip}><ellipse cx="70" cy="84" rx="48" ry="65" /></clipPath></defs>
    <path d="M64 21L70 12L76 21M23 73C12 68 12 95 23 94M117 73C128 68 128 95 117 94" fill={skin} stroke="#b49b84" strokeWidth="1.5" />
    <ellipse cx="70" cy="84" rx="48" ry="65" fill="#3e5049" />
    <g clipPath={`url(#${clip})`}>
      <path d={fronts[vertex ? 2 : stage]} fill={skin} />
      {(stage === 4 || stage === 5 || vertex) && <ellipse cx="70" cy={stage === 5 ? 114 : 113} rx={vertex ? 15 : stage === 4 ? 23 : 31} ry={vertex ? 16 : stage === 4 ? 21 : 27} fill={skin} />}
      {stage === 5 && <path d="M48 89Q70 81 92 89" fill="none" stroke="#8c9b8d" strokeWidth="3" strokeDasharray="1 3" />}
    </g>
    <ellipse cx="70" cy="84" rx="48" ry="65" fill="none" stroke="#b49b84" strokeWidth="1.5" />
  </svg>;
}

export default function NorwoodScaleReference({ estimate, confirmed }: { estimate?: number; confirmed?: number | null }) {
  const heading = useId();
  return <section className="nw-scale" aria-labelledby={heading}>
    <div className="nw-scale-heading"><div><span className="nw-workspace-eyebrow">ADVISOR REFERENCE</span><h3 id={heading}>Compare the pattern, then confirm</h3></div><div className="nw-scale-key"><span><i />Hair</span><span><i />Exposed / sparse scalp</span><span>Top views · front ↑</span></div></div>
    <ol className="nw-scale-grid">{STAGES.map(stage => <li key={stage.number} className={`nw-scale-card${estimate === stage.number ? ' nw-scale-ai' : ''}`}>
      <div className="nw-scale-number"><strong>Norwood {stage.number}</strong>{estimate === stage.number && <span>AI estimate</span>}</div>
      <Scalp stage={stage.number} />
      <h4>{stage.name}</h4><p>{stage.description}</p>
      {confirmed === stage.number && <span className="nw-scale-confirmed">Rep confirmed</span>}
    </li>)}</ol>
    <div className="nw-scale-variants"><div className="nw-scale-vertex"><Scalp stage={3} vertex /><p><strong>Also stage 3: III vertex.</strong> Loss is mainly at the crown, with no more than stage 3 recession at the front.</p></div><p><strong>Check all five angles.</strong> “A” variants recede from front to back without a separate crown patch; diffuse or patchy loss may not fit this chart.</p><p>Illustrative guide, not a diagnosis.<br /><a href="https://www.hrbr.ie/hair-classification/" target="_blank" rel="noopener noreferrer">Clinical stage definitions ↗</a></p></div>
    <p className="nw-scale-confirm">Return to the call form to confirm or change the Norwood number. The doctor confirms at consultation.</p>
  </section>;
}
