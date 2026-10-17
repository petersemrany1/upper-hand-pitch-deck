import { z } from 'zod';
import { norwoodObservationsSchema, parseNorwoodModelResult, type NorwoodModelResult } from './norwood-evidence';
import { NORWOOD_PROMPT_VERSION } from './norwood-assessment';
const recorded = z.object({proposed_norwood:z.number().int().min(1).max(3),observations:norwoodObservationsSchema}).strict();
/** Recover only the known early-stage bridge-label bug, without another model call.
 * This uses existing service-owned evidence; callers never supply a proposed grade.
 */
export function recoverEarlyNorwoodEvidence(row: {
  status:string; photo_problems:string[]; prompt_version?:string|null; ai_observations?:unknown;
  revoked_at:string|null; expires_at:string;
}, now=Date.now()): NorwoodModelResult|null {
  if(row.status!=='failed'||!row.photo_problems.includes('HP-EVIDENCE')||row.prompt_version===NORWOOD_PROMPT_VERSION
    ||row.revoked_at||Date.parse(row.expires_at)<=now)return null;
  const parsed=recorded.safeParse(row.ai_observations);if(!parsed.success)return null;
  const {proposed_norwood,observations}=parsed.data;
  if(observations.pattern!=='standard'||observations.crown!=='preserved'||observations.bridge!=='substantial')return null;
  try{return parseNorwoodModelResult(JSON.stringify({norwood:proposed_norwood,observations,confidence:'low',reason:'Recovered from recorded observations; advisor confirmation required.',photo_problems:[]}));}
  catch{return null;}
}
