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
BRIDGES={'lib/leaderboard.functions':'bridge/leaderboard'}
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
    end=s.index(';', i)+1 if s[i+1:i+3].startswith(');') else i+2
    s=s[:m.start()]+f'// Rendered inside the Upper Hand portal when Legal is selected.\nexport {{ {comp} as LegalPage }};'+s[end:]
    s=re.sub(r'import \{\s*createFileRoute\s*\} from "@tanstack/react-router";\n','',s)
    s=s.replace('createFileRoute, ','')
    # Links into other Legal pages go to the matching portal section on its Legal side.
    def link(mm):
        to=mm.group(1); tgt=LINK_MAP.get(to)
        if not tgt: return mm.group(0)
        search=mm.group(2)
        inner=search[2:-2].strip() if search else ''
        return f'to="{tgt}" search={{{{ biz: "legal"{", "+inner if inner else ""} }} as never}}'
    s=re.sub(r'to="(/[a-z\-]+)"(?:\s+search=(\{\{[^}]*\}\}))?', link, s)
    open(p,'w').write(s)
    print('page',route,'->',comp)
