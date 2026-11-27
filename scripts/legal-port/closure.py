import os,re,sys,json
ROOT=os.path.expanduser('~/Documents/GitHub/family-law-floater/src')
imp=re.compile(r'''(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|^import\s+['"]([^'"]+)['"]''',re.M)
def resolve(spec,frm):
    if spec.startswith('@/'): base=os.path.join(ROOT,spec[2:])
    elif spec.startswith('.'): base=os.path.normpath(os.path.join(os.path.dirname(frm),spec))
    else: return None
    for ext in ['','.ts','.tsx','/index.ts','/index.tsx','.css']:
        p=base+ext
        if os.path.isfile(p): return p
    return 'MISSING:'+spec
def closure(start):
    seen=set();stack=[start]
    while stack:
        f=stack.pop()
        if f in seen or f.startswith('MISSING'): continue
        seen.add(f)
        if not f.endswith(('.ts','.tsx')): continue
        # Server modules are bridged or skipped, so don't follow their imports.
        if f!=start and ('.server' in f or '.functions' in f): continue
        src=open(f).read()
        for m in imp.finditer(src):
            s=m.group(1) or m.group(2) or m.group(3)
            r=resolve(s,f)
            if r: stack.append(r)
    return seen
for route in sys.argv[1:]:
    c=closure(os.path.join(ROOT,'routes/_authenticated',route))
    rel=sorted(os.path.relpath(x,ROOT) for x in c)
    srv=[x for x in rel if '.functions' in x or '.server' in x]
    ui=[x for x in rel if x.startswith('components/ui/')]
    lines=sum(len(open(os.path.join(ROOT,x)).read().splitlines()) for x in rel if not x.startswith('MISSING') and os.path.isfile(os.path.join(ROOT,x)))
    print(f"== {route}: {len(rel)} files, {lines} lines, ui={len(ui)}")
    print("   server:", srv)
