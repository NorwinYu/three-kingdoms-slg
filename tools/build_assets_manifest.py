#!/usr/bin/env python3
"""Build assets/manifest.js (paths) and 烽火三国.html (embedded assets)."""
import base64, json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets'/'generated'
ALIASES={'dongCavalry':'dongBrute','dongArcher':'dongBrute','weiArcher':'weiInfantry','jingArcher':'wuMarine','shuInfantry':'weiInfantry'}
def files(folder,ext='webp'):
    return sorted((OUT/folder).glob(f'*.{ext}'))
def make(paths=True):
    man={'portraits':{},'backdrops':{},'units':{},'items':{},'buildings':{},'terrain':{},'props':{},'skills':{},'achievements':{},'techs':{},'videos':{},'misc':{}}
    for f in files('portraits'):
        man['portraits'][f.stem]=f'assets/generated/portraits/{f.name}' if paths else 'data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode()
    for f in files('items'):
        man['items'][f.stem]=f'assets/generated/items/{f.name}' if paths else 'data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode()
    for f in files('buildings'):
        man['buildings'][f.stem]=f'assets/generated/buildings/{f.name}' if paths else 'data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode()
    for folder,key in [('terrain','terrain'),('props','props'),('skills','skills'),('achievements','achievements'),('techs','techs')]:
        for f in files(folder):
            inline=(key in ('terrain','props')) or (not paths)
            man[key][f.stem]=(f'assets/generated/{folder}/{f.name}' if not inline else 'data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode())
    for f in files('units'):
        # units are loaded by TextureLoader: always inline to avoid file:// CORS
        man['units'][f.stem]='data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode()
    for f in files('backdrops'):
        # always inline backdrops: Three.js TextureLoader cannot read file:// images (CORS)
        man['backdrops'][f.stem]='data:image/webp;base64,'+base64.b64encode(f.read_bytes()).decode()
    for f in files('videos','mp4'):
        man['videos'][f.stem]=f'assets/generated/videos/{f.name}' if paths else 'data:video/mp4;base64,'+base64.b64encode(f.read_bytes()).decode()
    menu=OUT/'misc'/'menu.webp'
    if menu.exists(): man['misc']['menu']=f'assets/generated/misc/menu.webp' if paths else 'data:image/webp;base64,'+base64.b64encode(menu.read_bytes()).decode()
    parchment=OUT/'misc'/'parchment.webp'
    if parchment.exists(): man['misc']['parchment']=f'assets/generated/misc/parchment.webp' if paths else 'data:image/webp;base64,'+base64.b64encode(parchment.read_bytes()).decode()
    video=OUT/'misc'/'menu.mp4'
    if video.exists(): man['misc']['menuVideo']=f'assets/generated/misc/menu.mp4' if paths else 'data:video/mp4;base64,'+base64.b64encode(video.read_bytes()).decode()
    for a,b in ALIASES.items():
        if b in man['portraits']: man['portraits'][a]=man['portraits'][b]
        if b in man['units']: man['units'][a]=man['units'][b]
    return man
if __name__=='__main__':
    (ROOT/'assets'/'manifest.js').write_text('window.AI_ASSETS = '+json.dumps(make(True),ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    man=make(False)
    html=(ROOT/'index.html').read_text(); css=(ROOT/'css/style.css').read_text()
    html=html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n'+css+'\n</style>')
    html=html.replace('<script src="assets/manifest.js"></script>', '<script>\nwindow.AI_ASSETS = '+json.dumps(man,ensure_ascii=False)+';\n</script>')
    for src in ['js/three.min.js','js/data.js','js/audio.js','js/art.js','js/core.js','js/ui.js','js/campaign.js','js/battle.js','js/main.js']:
        code=(ROOT/src).read_text().replace('</script>','<\\/script>')
        html=html.replace(f'<script src="{src}"></script>','<script>\n'+code+'\n</script>')
    (ROOT/'烽火三国.html').write_text(html)
    print('manifest', (ROOT/'assets'/'manifest.js').stat().st_size)
    print('standalone', (ROOT/'烽火三国.html').stat().st_size, 'bytes')
