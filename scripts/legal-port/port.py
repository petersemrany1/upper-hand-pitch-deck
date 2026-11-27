"""Copy a Legal page and its import closure into the Upper Hand repo under src/legal/.
Usage: port.py <route under routes/_authenticated> ...   (re-runnable; overwrites copies)"""
import os,re,sys,shutil
SRC=os.path.expanduser('~/Documents/GitHub/family-law-floater/src')
DST='/Users/peter/Developer/upper-hand-legal/src/legal'
exec(open(os.path.join(os.path.dirname(__file__),'closure.py')).read().split('for route in')[0].replace("ROOT=os.path.expanduser('~/Documents/GitHub/family-law-floater/src')","ROOT=SRC"))
SKIP={'integrations/supabase/client.ts','integrations/supabase/previewAuthStorage.ts'}
HEADER='// Ported from the Legal app (family-law-floater/src/{rel}). Re-run the port script to refresh.\n'
# Server modules with a portal replacement in src/legal/bridge/ (they read the
# Legal database through admin-only database functions instead of server keys).
BRIDGES={'lib/leaderboard.functions':'bridge/leaderboard','lib/call-review.functions':'bridge/call-review'}
def transform(text, rel):
    for frm,to in BRIDGES.items():
        text=text.replace(f'"@/{frm}"',f'"@/legal/{to}"')
    text=re.sub(r'''(['"])@/(?!legal/)''', r'\1@/legal/', text)
    text=text.replace('pitch-deck-root','legal-pitch-deck-root')
    return text
copied=[]
for route in sys.argv[1:]:
    for f in sorted(closure(os.path.join(SRC,'routes/_authenticated',route))):
        rel=os.path.relpath(f,SRC)
        if rel in SKIP or f.startswith('MISSING'): continue
        if '.server' in rel or '.functions' in rel:
            bridged=rel.rsplit('.',1)[0] in BRIDGES
            print('bridged:' if bridged else 'SERVER DEP, not copied:',rel); continue
        out=os.path.join(DST, 'pages/'+rel.split('routes/_authenticated/')[1] if rel.startswith('routes/') else rel)
        os.makedirs(os.path.dirname(out),exist_ok=True)
        data=open(f).read()
        if f.endswith(('.ts','.tsx','.css')):
            data=transform(data,rel)
            if f.endswith(('.ts','.tsx')) and not rel.endswith('types.ts'):
                data=HEADER.format(rel=rel)+data
        open(out,'w').write(data); copied.append(os.path.relpath(out,DST))
print('\n'.join(sorted(set(copied))))

# Turn each copied route file into a plain component module.
LINK_MAP={'/transcripts':'/my-recordings','/sales-call':'/sales-call','/booked-appointments':'/booked-appointments','/inbox':'/inbox','/leads':'/leads','/numbers':'/numbers','/training':'/training','/leaderboard':'/leaderboard','/firms':'/crm'}
for route in sys.argv[1:]:
    p=os.path.join(DST,'pages',route)
    s=open(p).read()
    m=re.search(r'export const Route = createFileRoute\([^)]*\)\(\{', s)
    if not m: continue
    # find matching close of the object literal
    depth=0; i=m.end()-1
    while True:
        ch=s[i]
        if ch=='{': depth+=1
        elif ch=='}':
            depth-=1
            if depth==0: break
        i+=1
    body=s[m.end()-1:i+1]
    comp=re.search(r'component:\s*(\w+)', body).group(1)
    # Keep the route options (validateSearch etc.) on a portal stand-in so
    # Route.useSearch() / Route.useRouteContext() keep working.
    s=s[:m.start()]+'export const Route = legalRoute('+s[m.end()-1:]
    s=s.replace('export const Route = legalRoute(', f'// Rendered inside the Upper Hand portal when Legal is selected.\nexport {{ {comp} as LegalPage }};\nexport const Route = legalRoute(',1)
    s=re.sub(r'import \{\s*createFileRoute\s*\} from "@tanstack/react-router";\n','',s)
    s=s.replace('createFileRoute, ','').replace(', createFileRoute','')
    s=s.replace('\nexport { '+comp, '\nimport { legalRoute } from "@/legal/bridge/route";\nexport { '+comp,1) if 'legalRoute } from' not in s else s
    # Links into other Legal pages go to the matching portal section on its Legal side.
    out=[]; pos=0
    for mm in re.finditer(r'to="(/[a-z\-]+)"', s):
        tgt=LINK_MAP.get(mm.group(1))
        if not tgt or mm.start()<pos: continue
        out.append(s[pos:mm.start()]); j=mm.end()
        sm=re.match(r'\s+search=\{', s[j:])
        expr=None
        if sm:
            k=j+sm.end()-1; depth=0
            while True:
                if s[k]=='{': depth+=1
                elif s[k]=='}':
                    depth-=1
                    if depth==0: break
                k+=1
            expr=s[j+sm.end():k].strip(); j=k+1
        extra=f', ...({expr})' if expr else ''
        out.append(f'to="{tgt}" search={{{{ biz: "legal"{extra} }} as never}}'); pos=j
    out.append(s[pos:]); s=''.join(out)
    open(p,'w').write(s)
    print('page',route,'->',comp)
