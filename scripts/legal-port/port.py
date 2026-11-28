"""Copy Legal app code into the Upper Hand repo under src/legal/.
Usage: port.py <route under routes/_authenticated> ...   one page and what it imports
       port.py --all                                     the whole Legal engine + every staff page
Re-runnable; overwrites copies. Portal-owned files (LegalView, legal.css, bridge/,
runtime/, move/ and the integrations/supabase shims) are never touched."""
import os,re,sys,shutil
SRC=os.environ.get('LEGAL_SRC') or os.path.expanduser('~/Documents/GitHub/family-law-floater/src')
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
ROUTES_DST='/Users/peter/Developer/upper-hand-legal/src/routes'
def port_api_route(f, rel):
    """routes/api/public/hooks/x.ts -> src/routes/api.public.hooks.x.ts, at the same address as in
    the Legal app (no portal route uses these), so once boldfamilylaw.com.au points at this app
    everything that rings it keeps working. Switched off until LEGAL_LIVE."""
    url='/'+rel[len('routes/'):-3]
    name=url.strip('/').replace('/','.')+'.ts'
    dst=os.path.join(ROUTES_DST,name)
    if os.path.exists(dst) and not open(dst).read().startswith('// Ported from the Legal app'):
        raise SystemExit(f'STOP: {name} is a portal route; Legal route {rel} would replace it')
    s=transform(open(f).read(),rel)
    s=s.replace('from "@/legal/runtime/router"','from "@tanstack/react-router"')
    s=re.sub(r'createFileRoute\("[^"]*"\)', f'createFileRoute("{url}")', s, count=1)
    # Each handler (GET/POST/…) first checks the master switch; the route
    # options stay a plain object so the build keeps server code server-side.
    pat=r'((?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*:\s*async\s*\([^)]*\)\s*(?::\s*[^=]+)?=>\s*\{)'
    methods=len(re.findall(r'\b(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*:', s))
    s,n=re.subn(pat, r'\1\n        const legalOff = legalHookOff();\n        if (legalOff) return legalOff;', s)
    if n==0 or n!=methods: print(f'CHECK API route {rel}: wrapped {n} of {methods} handlers')
    s='import { legalHookOff } from "@/legal/runtime/hooks";\n'+s
    open(os.path.join(ROUTES_DST,name),'w').write(HEADER.format(rel=rel)+s)
    return name
copied=[]
ALL='--all' in sys.argv
# Legal pages outside the staff area: the firm portal and the pages clients and
# firms reach from links (offers, deposits, set password). Copied to pages/public/.
PUBLIC_PAGES={'firm-portal.tsx','firm-offer.tsx','firm-offer-complete.tsx',
              'deposit-confirmed.tsx','deposit-cancelled.tsx','set-password.tsx','pay-per-show.tsx','portal-guide.tsx'}
if ALL:
    # Legal's public files (logo, videos, the dialler's Twilio script) at the same addresses.
    for sub in ('media','vendor'):
        src_pub=os.path.join(os.path.dirname(SRC),'public',sub)
        if os.path.isdir(src_pub): shutil.copytree(src_pub, os.path.join(os.path.dirname(ROUTES_DST),'..','public',sub), dirs_exist_ok=True)
    # Drop earlier copies of Legal API routes (they are recreated below).
    for fn in os.listdir(ROUTES_DST):
        fp=os.path.join(ROUTES_DST,fn)
        if fn.startswith(('api.','functions.')) and os.path.isfile(fp) and open(fp).read().startswith('// Ported from the Legal app'): os.remove(fp)
    pages=[]; public_pages=[]
    for dirpath,_,files in os.walk(SRC):
        for fn in files:
            f=os.path.join(dirpath,fn); rel=os.path.relpath(f,SRC)
            if rel in SHIMS or rel in SHELL: continue
            if rel.startswith(('routes/api/','routes/functions/')) and rel.endswith('.ts'):
                if port_api_route(f,rel): copied.append(rel)
                continue
            if rel.startswith('routes/'):
                # The staff layout (route.tsx) is the Legal app's own shell; the portal has its own.
                if rel.startswith('routes/_authenticated/') and rel.endswith('.tsx') and rel!='routes/_authenticated/route.tsx': pages.append(rel.split('routes/_authenticated/')[1])
                elif rel[len('routes/'):] in PUBLIC_PAGES: public_pages.append(rel[len('routes/'):])
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
    for page in public_pages:
        f=os.path.join(SRC,'routes',page); out=os.path.join(DST,'pages/public',page)
        os.makedirs(os.path.dirname(out),exist_ok=True)
        open(out,'w').write(HEADER.format(rel='routes/'+page)+transform(open(f).read(),page))
    pages=pages+['public/'+p for p in public_pages]
    sys.argv=[sys.argv[0]]+pages
    print(f'copied {len(copied)} engine files and {len(pages)} pages ({len(public_pages)} public)')
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
