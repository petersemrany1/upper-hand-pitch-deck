"""Copy Legal app code into the Upper Hand repo under src/legal/.
Usage: port.py <route under routes/_authenticated> ...   one page and what it imports
       port.py --all                                     the whole Legal engine + every staff page
Re-runnable; overwrites copies. Portal-owned files (LegalView, legal.css, bridge/,
runtime/, move/ and the integrations/supabase shims) are never touched."""
import os,re,sys,shutil
SRC=os.path.expanduser('~/Documents/GitHub/family-law-floater/src')
DST='/Users/peter/Developer/upper-hand-legal/src/legal'
exec(open(os.path.join(os.path.dirname(__file__),'closure.py')).read().split('for route in')[0].replace("ROOT=os.path.expanduser('~/Documents/GitHub/family-law-floater/src')","ROOT=SRC"))
SKIP={'integrations/supabase/client.ts','integrations/supabase/previewAuthStorage.ts'}
HEADER='// Ported from the Legal app (family-law-floater/src/{rel}). Re-run the port script to refresh.\n'
# Server modules with a portal replacement in src/legal/bridge/ (they read the
# Legal database through admin-only database functions instead of server keys).
BRIDGES={'lib/leaderboard.functions':'bridge/leaderboard','lib/call-review.functions':'bridge/call-review'}
# Portal shims stand in for these Legal files (see src/legal/integrations/supabase/).
SHIMS={'integrations/supabase/client.ts','integrations/supabase/client.server.ts','integrations/supabase/auth-middleware.ts',
       'integrations/supabase/auth-attacher.ts','integrations/supabase/previewAuthStorage.ts'}
# App shell files the portal provides itself.
SHELL={'routeTree.gen.ts','router.tsx','server.ts','start.ts','prominent-env.d.ts','styles.css'}
ENV_IMPORT='import { legalEnv } from "@/legal/runtime/env";\n'
def transform(text, rel):
    # Legal settings only ever come from LEGAL_-prefixed values (src/legal/runtime/env.ts).
    if re.search(r'\bprocess\.env\b', text) and rel.endswith(('.ts','.tsx')):
        text=re.sub(r'\bprocess\.env\b','legalEnv',text)
        text=ENV_IMPORT+text
    for frm,to in BRIDGES.items():
        text=text.replace(f'"@/{frm}"',f'"@/legal/{to}"')
    # Router helpers that map Legal addresses to portal sections (src/legal/runtime/router.tsx).
    text=text.replace('from "@tanstack/react-router"','from "@/legal/runtime/router"')
    text=re.sub(r'''(['"])@/(?!legal/)''', r'\1@/legal/', text)
    text=text.replace('pitch-deck-root','legal-pitch-deck-root')
    return text
copied=[]
ALL='--all' in sys.argv
if ALL:
    pages=[]
    for dirpath,_,files in os.walk(SRC):
        for fn in files:
            f=os.path.join(dirpath,fn); rel=os.path.relpath(f,SRC)
            if rel in SHIMS or rel in SHELL: continue
            if rel.startswith('routes/'):
                # The staff layout (route.tsx) is the Legal app's own shell; the portal has its own.
                if rel.startswith('routes/_authenticated/') and rel.endswith('.tsx') and rel!='routes/_authenticated/route.tsx': pages.append(rel.split('routes/_authenticated/')[1])
                continue
            out=os.path.join(DST,rel); os.makedirs(os.path.dirname(out),exist_ok=True)
            if f.endswith(('.ts','.tsx','.css')):
                data=transform(open(f).read(),rel)
                if f.endswith(('.ts','.tsx')) and not rel.endswith(('types.ts','.d.ts')): data=HEADER.format(rel=rel)+data
                open(out,'w').write(data)
            else:
                shutil.copyfile(f,out)
            copied.append(rel)
    for page in pages:
        f=os.path.join(SRC,'routes/_authenticated',page); out=os.path.join(DST,'pages',page)
        os.makedirs(os.path.dirname(out),exist_ok=True)
        open(out,'w').write(HEADER.format(rel='routes/_authenticated/'+page)+transform(open(f).read(),page))
    sys.argv=[sys.argv[0]]+pages
    print(f'copied {len(copied)} engine files and {len(pages)} pages')
for route in ([] if ALL else sys.argv[1:]):
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
if not ALL: print('\n'.join(sorted(set(copied))))

# Turn each copied route file into a plain component module.
LINK_MAP={'/transcripts':'/my-recordings','/sales-call':'/sales-call','/booked-appointments':'/booked-appointments','/inbox':'/inbox','/leads':'/leads','/numbers':'/numbers','/training':'/training','/leaderboard':'/leaderboard','/firms':'/crm'}
for route in sys.argv[1:]:
    p=os.path.join(DST,'pages',route)
    s=open(p).read()
    m=re.search(r'export const Route = createFileRoute\([^)]*\)\(\{', s)
    if not m:
        if ALL and 'createFileRoute' in s: print('SKIPPED (unusual route shape):',route)
        continue
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
    cm=re.search(r'component:\s*(\w+)\s*[,}\n]', body)
    if cm:
        comp=cm.group(1)
    else:
        # Inline component (component: () => (...)): lift it into a named const.
        km=re.search(r'component:\s*', body)
        if not km:
            if ALL: print('SKIPPED (no component):',route)
            continue
        j=km.end(); depth=0; k=j
        while k<len(body):
            ch=body[k]
            if ch in '([{': depth+=1
            elif ch in ')]}':
                if depth==0: break
                depth-=1
            elif ch==',' and depth==0: break
            k+=1
        expr=body[j:k].strip()
        comp='LegalRoutePage'
        new_body=body[:j]+comp+body[k:]
        s=s.replace(body,new_body,1)
        s=s[:m.start()]+f'const {comp} = {expr};\n\n'+s[m.start():]
        m=re.search(r'export const Route = createFileRoute\([^)]*\)\(\{', s)
    # Keep the route options (validateSearch etc.) on a portal stand-in so
    # Route.useSearch() / Route.useRouteContext() keep working.
    s=s[:m.start()]+'export const Route = legalRoute('+s[m.end()-1:]
    s=s.replace('export const Route = legalRoute(', f'// Rendered inside the Upper Hand portal when Legal is selected.\nexport {{ {comp} as LegalPage }};\nexport const Route = legalRoute(',1)
    s=re.sub(r'import \{\s*createFileRoute\s*\} from "@(?:tanstack/react-router|/legal/runtime/router)";\n','',s)
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
    if not ALL: print('page',route,'->',comp)
