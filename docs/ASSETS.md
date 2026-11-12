# AI 生成资产说明

> 本项目的全部视觉与视频素材均为 **AI 生成 / AI 辅助生成**，仅用于非商业技术 Demo。  
> 生成模型：**MiniMax H3**（图像 / 视频）  
> 代码、UI、程序化音频与文档：**DeepSeek Flash** 辅助生成与迭代

---

## 1. 资产总览

| 类别 | 数量 | 目录 | 用途 |
|---|---:|---|---|
| 武将立绘 | 47 | `assets/generated/portraits/` | 名册、详情、剧情、战斗 UI |
| 兵种/单位头像 | 6 | `assets/generated/portraits/` | 敌军兵种 UI |
| 全身单位 | 53 | `assets/generated/units/` | 战场 2.5D 单位 |
| 道具图标 | 17 | `assets/generated/items/` | 商肆、图鉴、装备栏 |
| 建筑图标 | 6 | `assets/generated/buildings/` | 城池营造 |
| 战法图标 | 34 | `assets/generated/skills/` | 武将详情、战法弹窗 |
| 成就图标 | 12 | `assets/generated/achievements/` | 图鉴成就 |
| 科技图标 | 12 | `assets/generated/techs/` | 科技树 |
| 地形纹理 | 11 | `assets/generated/terrain/` | 战场格子 |
| 植被/岩石 | 3 | `assets/generated/props/` | 森林/丘陵装饰 |
| 战场背景 | 5 | `assets/generated/backdrops/` | 战斗背景 |
| 剧情视频 | 3 | `assets/generated/videos/` | 晨/暮/火夜剧情 |
| Boss 视频 | 3 | `assets/generated/videos/` | 吕布/曹操/董卓 cut-in |
| 菜单视频 | 1 | `assets/generated/misc/menu.mp4` | 主菜单 |
| 羊皮纸 | 1 | `assets/generated/misc/parchment.webp` | 大地图叠加 |

---

## 2. 生成方式

### 2.1 武将立绘

- H3 text-to-image，`portrait` 预设 1152×2048
- 统一提示词：半身、正面、电影侧光、水墨/绘卷、暗色背景、金/朱砂色
- 输出裁切为 576×1024 WebP

### 2.2 全身单位

- 同风格全身立绘
- 纯绿背景生成
- Pillow 色键抠图 + 去绿边
- 输出透明 WebP（约 512×1024）

### 2.3 道具 / 建筑 / 图标

- H3 1K 图像
- 居中单物件，深色羊皮纸背景
- 裁切 512×512 WebP

### 2.4 地形纹理

- 无缝/tileable 俯视纹理提示词
- 11 类：草地、道路、森林、丘陵、山岩、江水、木桥、村落、城墙、河滩、焦土
- 512×512 WebP

### 2.5 视频

- H3 image-to-video（ref2va）
- 3 秒左右，1344×768，24fps
- 剧情：空战场图 → 镜头推进/雾/烟/余烬
- Boss：立绘 → 呼吸/眼神/盔甲反光/烟尘
- 菜单：text-to-video 战场全景

---

## 3. 运行时如何加载

- `index.html` 加载 `assets/manifest.js`
- 立绘/图标通过 `<img>` 路径加载
- 地形/单位/背景通过 Three.js `TextureLoader` 加载
- 因为 `file://` 下 `TextureLoader` 受 CORS 限制，**地形/单位/背景在 manifest 中使用 data URL**
- 视频使用 `<video>`，桌面端播放，手机端回退静态图
- 单文件版 `烽火三国.html` 把全部资产以 data URL 内嵌

---

## 4. 重新生成

需要一台运行 H3 agent 服务的机器（默认 `http://127.0.0.1:8190`），或设置环境变量：

```bash
export H3_URL=http://<your-h3-host>:8190
```

然后：

```bash
python3 tools/generate_h3_portraits.py
python3 tools/generate_h3_units.py
python3 tools/generate_h3_units_more.py
python3 tools/generate_h3_units_remaining.py
python3 tools/generate_h3_items_buildings.py
python3 tools/generate_h3_remaining.py
python3 tools/generate_h3_skill_icons.py
python3 tools/generate_h3_ach_tech_icons.py
python3 tools/generate_h3_terrain.py
python3 tools/generate_h3_backdrops.py
python3 tools/generate_h3_story_videos.py
python3 tools/generate_h3_boss_videos.py
python3 tools/generate_h3_video.py
python3 tools/generate_h3_parchment.py
```

最后重建清单与单文件版：

```bash
python3 tools/build_assets_manifest.py
```

`tools/legacy/generate_assets_a1111.py` 是旧版 A1111 脚本，仅作参考，不是当前管线。

---

## 5. 资产替换

### 替换单张立绘

把同名 WebP 放到 `assets/generated/portraits/<id>.webp`，再运行：

```bash
python3 tools/build_assets_manifest.py
```

### 替换单位

`assets/generated/units/<defId>.webp`，透明背景，建议 512×1024。

### 替换地形

`assets/generated/terrain/<terrainId>.webp`，512×512，建议 tileable。

### 替换视频

`assets/generated/videos/<key>.mp4`，16:9，3 秒左右；键名见 manifest。

---

## 6. 版权与限制

- 生成素材采用 **CC BY-NC 4.0**，仅限非商业使用，见 `LICENSE-ASSETS`。
- 代码采用 MIT，见 `LICENSE`。
- 本项目与 DeepSeek、MiniMax 无隶属关系。
- 生成模型/服务的使用条款以官方为准。
- AI 输出可能有瑕疵、重复或不准确；这是技术 Demo 的一部分。
- 不包含任何商业游戏素材、盗版素材或来源不明素材。

---

## 7. 为什么不用 3D 模型

本 Demo 的目标是验证：

1. 纯前端战棋系统是否能在浏览器/手机完整跑通；
2. DeepSeek Flash + MiniMax H3 能否快速生成一整套可用资产；
3. 在不使用商业素材的前提下，Demo 能否达到“可看、可玩、可展示”。

因此单位采用 **2.5D 全身立绘 + 程序补间**，而不是 3D 骨骼。  
3D 角色、骨骼动画、配音与过场属于后续路线，见 [ROADMAP.md](ROADMAP.md)。
