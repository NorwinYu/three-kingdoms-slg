#!/usr/bin/env python3
"""烽火三国 · 局域网 AI 生图脚本（Stable Diffusion WebUI / A1111 API）

用法：
  python3 tools/generate_assets.py --url http://<your-sd-host>:7860
  python3 tools/generate_assets.py --url http://127.0.0.1:7860 --only portraits
  python3 tools/generate_assets.py --url http://... --list

要求另一台电脑（或本机）运行 AUTOMATIC1111 Stable Diffusion WebUI，并带 --api --listen。
脚本会调用 /sdapi/v1/txt2img，把图片写入 assets/portraits 与 assets/backdrops，
并生成 assets/manifest.js。之后用 index.html 打开游戏即可自动替换程序化立绘/背景。
"""
import argparse, base64, json, os, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
PORTRAITS = ASSETS / 'portraits'
BACKDROPS = ASSETS / 'backdrops'

STYLE = ("masterpiece, best quality, cinematic Chinese ink wash concept art, Three Kingdoms era, "
         "semi-realistic historical costume, dramatic chiaroscuro lighting, muted cinnabar, jade and antique gold, "
         "fine brush texture, paper grain, atmospheric, detailed armor, no text, no watermark")
NEG = ("lowres, bad anatomy, bad hands, extra fingers, deformed face, cartoon, chibi, anime, plastic 3d, "
       "modern clothes, text, watermark, logo, frame, border, oversaturated, blurry")

PORTRAIT_PROMPTS = {
 'liubei': 'Liu Bei, benevolent Han dynasty warlord, 38 years old, kind but weary eyes, short beard, green and gold hanfu armor, imperial jade crown, dark teal background, half-length portrait',
 'guanyu': 'Guan Yu, legendary Three Kingdoms general, long magnificent black beard, red weathered face, phoenix eyes, green robe and lamellar armor, green cloth guan hat, holding guandao, dramatic side light, half-length portrait',
 'zhangfei': 'Zhang Fei, fearsome Three Kingdoms general, dark iron helmet, bristling black beard, glaring eyes, black and bronze armor, spear, smoke and embers, half-length portrait',
 'zhaoyun': 'Zhao Yun, young heroic Three Kingdoms general, silver-white armor and white plume, handsome sharp face, spear, cold moonlight, half-length portrait',
 'zhugeliang': 'Zhuge Liang, elegant Three Kingdoms strategist, white scholar robe, feathered fan, calm intelligent eyes, goatee, silk headscarf, misty mountain background, half-length portrait',
 'huangzhong': 'Huang Zhong, veteran archer general, 60 years old, white beard, weathered strong face, bronze scale armor, longbow, autumn forest, half-length portrait',
 'machao': 'Ma Chao, young fierce cavalry general of Xiliang, white silver armor, white plume helmet, handsome stern face, spear, desert dust, half-length portrait',
 'weiyan': 'Wei Yan, ambitious Three Kingdoms infantry general, dark bronze armor, scarred face, short beard, heavy blade, storm light, half-length portrait',
 'lvbu': 'Lu Bu, peerless Three Kingdoms warrior, gold crown with two long pheasant feathers, red and gold armor, handsome arrogant face, halberd, fire and smoke, half-length portrait',
 'caocao': 'Cao Cao, cunning Three Kingdoms warlord, dark blue and gold armor, narrow calculating eyes, short beard, black crown, cold moonlight, half-length portrait',
 'sunquan': 'Sun Quan, young lord of Wu, red and gold armor, handsome resolute face, short beard, river and warships background, half-length portrait',
 'zhouyu': 'Zhou Yu, elegant Wu commander, red armor and gold trim, handsome refined face, feather fan, river fire, half-length portrait',
 'zhangjiao': 'Zhang Jiao, Yellow Turban leader, yellow daoist robe, wild white hair and beard, mystical glowing eyes, yellow headband, storm and talismans, half-length portrait',
 'huaxiong': 'Hua Xiong, brutal Dong Zhuo general, heavy dark armor, fierce bearded face, huge blade, burning gate, half-length portrait',
 'xiahoudun': 'Xiahou Dun, one-eyed Wei general, black eyepatch, dark blue armor, scarred face, stern, half-length portrait',
 'huanggai': 'Huang Gai, old Wu general, white beard, red armor, determined weathered face, fire ships, half-length portrait',
}

BACKDROP_PROMPTS = {
 'dawn': 'vast ancient Chinese battlefield at dawn, floating ink-wash mountain ranges, low mist, distant war banners, muted jade and warm gold, cinematic wide concept art, no characters, no text',
 'day': 'ancient Chinese battlefield under pale daylight, ink-wash mountains and river, distant fortifications, dust, cinematic wide concept art, no characters, no text',
 'dusk': 'ancient Chinese battlefield at dusk, cinnabar sun, dark mountains, drifting smoke, silhouetted banners, cinematic wide concept art, no characters, no text',
 'storm': 'ancient Chinese battlefield in a storm, dark clouds, rain, distant mountains, lightning, cold teal and charcoal, cinematic wide concept art, no characters, no text',
 'fire': 'ancient Chinese river battle at night, burning ships and red smoke, distant ink mountains, embers, cinematic wide concept art, no characters, no text',
}

def post_json(url, payload, timeout=600):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url.rstrip('/') + '/sdapi/v1/txt2img', data=data,
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))

def generate(url, prompt, negative, width, height, steps, sampler):
    payload = {
        'prompt': prompt, 'negative_prompt': negative,
        'width': width, 'height': height, 'steps': steps, 'cfg_scale': 7,
        'sampler_name': sampler, 'batch_size': 1, 'n_iter': 1,
        'restore_faces': True, 'save_images': False,
    }
    res = post_json(url, payload)
    imgs = res.get('images') or []
    if not imgs:
        raise RuntimeError('API returned no image')
    return base64.b64decode(imgs[0].split(',', 1)[-1])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://127.0.0.1:7860')
    ap.add_argument('--only', choices=['portraits','backdrops','all'], default='all')
    ap.add_argument('--steps', type=int, default=28)
    ap.add_argument('--sampler', default='DPM++ 2M Karras')
    ap.add_argument('--list', action='store_true')
    args = ap.parse_args()
    if args.list:
        for k,v in PORTRAIT_PROMPTS.items(): print(f'[portrait] {k}: {v}')
        for k,v in BACKDROP_PROMPTS.items(): print(f'[backdrop] {k}: {v}')
        return
    PORTRAITS.mkdir(parents=True, exist_ok=True)
    BACKDROPS.mkdir(parents=True, exist_ok=True)
    manifest = {'portraits':{}, 'backdrops':{}, 'units':{}}
    try:
        urllib.request.urlopen(args.url.rstrip('/') + '/sdapi/v1/sd-models', timeout=8).read()
    except Exception as e:
        print(f'无法连接 {args.url}: {e}')
        print('请确认另一台电脑已启动 Stable Diffusion WebUI，并用 --api --listen 启动；')
        print('例如：./webui.sh --api --listen --port 7860')
        sys.exit(2)
    todo = []
    if args.only in ('portraits','all'):
        todo += [('portrait', k, v) for k,v in PORTRAIT_PROMPTS.items()]
    if args.only in ('backdrops','all'):
        todo += [('backdrop', k, v) for k,v in BACKDROP_PROMPTS.items()]
    for i,(kind,key,prompt) in enumerate(todo,1):
        print(f'[{i}/{len(todo)}] {kind}: {key}')
        try:
            if kind == 'portrait':
                img = generate(args.url, STYLE + ', ' + prompt, NEG, 768, 960, args.steps, args.sampler)
                out = PORTRAITS / f'{key}.png'; out.write_bytes(img)
                manifest['portraits'][key] = f'assets/portraits/{key}.png'
            else:
                img = generate(args.url, STYLE + ', ' + prompt, NEG, 1536, 864, args.steps, args.sampler)
                out = BACKDROPS / f'{key}.png'; out.write_bytes(img)
                manifest['backdrops'][key] = f'assets/backdrops/{key}.png'
            print('   ->', out)
        except Exception as e:
            print('   !!', e)
        time.sleep(0.5)
    (ASSETS / 'manifest.js').write_text(
        '/* generated by tools/generate_assets.py */\n'
        'window.AI_ASSETS = ' + json.dumps(manifest, ensure_ascii=False, indent=2) + ';\n',
        encoding='utf-8')
    print('完成，已更新 assets/manifest.js。用 index.html 打开游戏。')

if __name__ == '__main__':
    main()
