import test from 'node:test';
import assert from 'node:assert/strict';
import { MetaError, type Graph } from '../../../supabase/functions/_shared/meta-ads/graph.ts';
import { accessMessage, grantedPermissions, pagesForAccount } from '../../../supabase/functions/_shared/meta-ads/page-access.ts';

function readOnlyGraph(responses: Record<string, unknown>): Graph {
  const read = async (path: string) => {
    const value = responses[path];
    if (value instanceof Error) throw value;
    if (value === undefined) throw new MetaError('Optional edge unavailable');
    return value;
  };
  return { get: read as Graph['get'], all: read as Graph['all'], post: async () => { throw Error('Unexpected write'); } };
}

test('restrict assigned Pages to advertising tasks and the configured ad account', async () => {
  const graph = readOnlyGraph({
    'act_12/promote_pages': [],
    'me/assigned_pages': [
      {id:'1',name:'Clinic',tasks:['ADVERTISE']},
      {id:'2',name:'Other brand',tasks:['MANAGE']},
      {id:'3',name:'Reporting only',tasks:['ANALYZE']},
    ],
    'act_12': {business:{id:'99'}},
    '99/owned_pages': [{id:'3'}],
    'act_12/adsets': [{promoted_object:{page_id:'1'}}],
  });
  assert.deepEqual(await pagesForAccount(graph,'act_12'), [{id:'1',name:'Clinic'}]);
});

test('propagate temporary Meta failures instead of reporting no Pages', async () => {
  const graph = readOnlyGraph({'act_12/promote_pages': new MetaError('Rate limited',false,true)});
  await assert.rejects(pagesForAccount(graph,'act_12'), /Rate limited/);
});

test('distinguish missing token scopes from unknown scope information', async () => {
  const reporting = readOnlyGraph({'me/permissions': [{permission:'ads_read',status:'granted'},{permission:'ads_management',status:'declined'}]});
  const grants = await grantedPermissions(reporting);
  assert.match(accessMessage([], grants, 'Portal')!, /missing ads_management, pages_show_list, pages_manage_ads/);
  assert.doesNotMatch(accessMessage([], await grantedPermissions(readOnlyGraph({})), 'Portal')!, /missing ads_management/);
});
