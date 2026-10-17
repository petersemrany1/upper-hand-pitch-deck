import { expect, test } from 'bun:test';
import { recoverEarlyNorwoodEvidence } from './norwood-evidence-recovery';
import { NORWOOD_PROMPT_VERSION, NORWOOD_VIEWS } from './norwood-assessment';
const row={status:'failed',photo_problems:['HP-EVIDENCE'],prompt_version:'older-version',revoked_at:null,expires_at:'2099-01-01',ai_observations:{proposed_norwood:2,observations:{
  views:Object.fromEntries(NORWOOD_VIEWS.map(v=>[v,'clear'])),pattern:'standard',hairline:'mild_temple',crown:'preserved',bridge:'substantial',fringe:'broad',anterior_extent:'not_applicable',boundary_uncertain:false,
}}};
test('known bridge-label failures recover the recorded grade with low confidence, without a new inference',()=>{
  const result=recoverEarlyNorwoodEvidence(row);expect(result?.norwood).toBe(2);expect(result?.confidence).toBe('low');
});
test('recovery cannot reopen expired/revoked sessions or turn genuinely inconsistent evidence into a grade',()=>{
  for(const patch of [{expires_at:'2020-01-01'},{revoked_at:'2026-01-01'},{status:'ready'},{photo_problems:['HP-REVIEW']},{prompt_version:NORWOOD_PROMPT_VERSION},{ai_observations:null},
    {ai_observations:{...row.ai_observations,proposed_norwood:7}},
    {ai_observations:{...row.ai_observations,observations:{...row.ai_observations.observations,hairline:'extensive'}}},
    {ai_observations:{...row.ai_observations,observations:{...row.ai_observations.observations,views:{...row.ai_observations.observations.views,crown:'wrong_view'}}}},
  ])expect(recoverEarlyNorwoodEvidence({...row,...patch})).toBeNull();
});
