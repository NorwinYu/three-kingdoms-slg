# 烽火三国 · 汉末风云

**一个完全由 AI 参与生成的浏览器三国战棋 Demo。**

> **重要声明**  
> 这是一个**非商业技术 Demo / 垂直切片**，用于尝试 **DeepSeek Flash（代码与系统迭代）+ MiniMax H3（图像/视频生成）** 的组合。  
> 所有武将立绘、全身单位、道具、建筑、地形、战场背景与视频均由 **MiniMax H3** 生成；代码、UI、程序化音频由 **DeepSeek Flash** 辅助生成。  
> 本项目**仅供学习、研究和非商业展示**，不得用于商业发行、付费下载、广告变现或任何商业用途。  
> 本项目与 DeepSeek、MiniMax 及任何游戏发行商无隶属关系。

[![License: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Assets: CC BY-NC 4.0](https://img.shields.io/badge/assets-CC%20BY--NC%204.0-lightgrey.svg)](LICENSE-ASSETS)

---

## 快速开始

### 在线 / 本地网页版（推荐）

```bash
cd three-kingdoms-slg
python3 -m http.server 8080
```

打开 `http://127.0.0.1:8080/`。

> 部署到 GitHub Pages 后，直接访问仓库根路径即可。详见 [部署说明](docs/DEPLOYMENT.md)。

### 离线单文件版

双击 **`烽火三国.html`**。

- 约 40 MB
- 代码、Three.js、全部图片、视频已内嵌
- 移动文件后仍可运行
- 适合离线演示 / 邮件发送

### 环境

- 最新版 Chrome / Edge / Safari
- 无需安装、无需后端、无需联网
- 存档在浏览器 `localStorage`

---

## 特色展示

![主菜单](screenshots/menu.png)

### 01 · Boss 图生视频登场

吕布、曹操、董卓的立绘用 MiniMax H3 做 image-to-video，战前 3 秒 cut-in：呼吸、眼神、盔甲反光、烟尘和缓慢推镜。

![吕布 Boss 登场](screenshots/boss-cutin.png)

### 02 · 战棋沙盘

12×9 网格、行动序、地形、天气、火场、高低差、反击、夹击、增援、Boss、自动战斗。  
地面换成 **11 张生成地形纹理**，森林/丘陵使用生成式树木与巨石，全部单位显示 Canvas 血条。

![战棋沙盘](screenshots/battle.png)

### 03 · 布阵与武将养成

最多 5 将出战，4 种阵形；47 名武将、等级/五维/忠诚、装备四槽与 4 套套装。

| 布阵 | 套装 |
|---|---|
| <img src="screenshots/deployment.png" width="100%"> | <img src="screenshots/equipment-sets.png" width="100%"> |

### 04 · 大地图经营

11 座城池、内政、外交、科技、招贤、商肆、随机事件、章回目标。  
大地图叠加生成式羊皮纸纹理。

| 汉末大地图 | 城池营造 |
|---|---|
| <img src="screenshots/campaign.png" width="100%"> | <img src="screenshots/city-buildings.png" width="100%"> |

### 05 · 科技树与收集

兵法/农政/工造三系 12 节点，34 个战法图标、12 个成就图标、12 个科技图标全部生成并接入。

| 科技树 | 成就 |
|---|---|
| <img src="screenshots/tech-icons.png" width="100%"> | <img src="screenshots/achievement-icons.png" width="100%"> |

### 06 · 剧情与图鉴

6 章章回、图生视频背景、Boss cut-in、人物/典故/神兵/成就图鉴。

| 章回演出 | 神兵图鉴 |
|---|---|
| <img src="screenshots/story.png" width="100%"> | <img src="screenshots/codex-items.png" width="100%"> |

### 07 · 手机端

竖屏/横屏、单指平移、双指缩放、目标卡片、行动序抽屉、城池抽屉。

<img src="screenshots/mobile-menu.png" width="240" alt="手机主菜单"> <img src="screenshots/mobile-battle.png" width="240" alt="手机战斗"> <img src="screenshots/mobile-campaign.png" width="240" alt="手机大地图">

![手机横屏战斗](screenshots/mobile-landscape-battle.png)

### 08 · 存档与继续

4 个存档位 + 自动存档，支持 JSON 导出/导入；浏览器 localStorage，无后端。

![存档](screenshots/saves.png)

---


### 09 · AI 资产一览

| 47 武将 + 6 兵种头像 | 53 个全身单位 |
|---|---|
| <img src="screenshots/portrait-grid.png" width="100%"> | <img src="screenshots/unit-grid.png" width="100%"> |

| 34 个战法图标 | 11 张地形纹理 |
|---|---|
| <img src="screenshots/skill-icons.png" width="100%"> | <img src="screenshots/terrain-grid.png" width="100%"> |

> 以上全部由 MiniMax H3 生成；UI、程序化音频与代码由 DeepSeek Flash 辅助生成。

---

## 这是什么

一个纯前端、可离线运行的三国战棋 SLG Demo：

- **大地图**：11 座城池、内政、外交、科技、招贤、商肆、事件
- **战棋战斗**：12×9 网格、行动序、地形、天气、火场、增援、Boss、自动战斗
- **武将养成**：47 名武将、等级、五维、战法、忠诚、装备四槽、套装
- **章回剧情**：6 章、6 场章回战、8 篇典故、12 个成就
- **移动端**：竖屏/横屏、触控、目标卡片、小地图
- **AI 资产**：47 张武将立绘、53 个全身单位、17 件道具、6 个建筑、11 张地形、5 张背景、7 段视频

完整玩法见 **[docs/GAMEPLAY.md](docs/GAMEPLAY.md)**。

---

## 玩法速览

### 大地图

1. 经营城池：征兵、赈济、巡查、修城、升级建筑。
2. 使用军令出征相邻敌城。
3. 处理外交、科技、装备、招贤。
4. 结束回合，结算收入与敌军行动。

### 战斗

1. 布阵：最多 5 将，选择阵形。
2. 按行动序移动、攻击、放战法、待机。
3. 利用兵种克制、夹击、高低差、地形与天气。
4. 达成目标：歼灭 / 斩将 / 坚守。
5. 战后结算：MVP、经验、战利品、升级。

### 自动战斗

- 右上角「自动」或 `A`
- AI 接管我方全部行动
- 默认 ×2，可切 ×3
- 再点关闭，当前单位行动结束后交还控制

### 手机

- 单指拖动平移，双指缩放
- 点击「攻击 / 战法」后从底部目标卡片选择
- 点击左上角回合条查看行动序
- 右下角「城池」打开城池抽屉

完整操作、系统与技巧见 **[docs/GAMEPLAY.md](docs/GAMEPLAY.md)**。

---

## 系统一览

| 系统 | 内容 |
|---|---|
| 章回 | 6 章：桃园结义、虎牢关、卧龙出山、长坂坡、赤壁、定军山 |
| 武将 | 47 名，等级/经验/五维/忠诚/品阶 |
| 兵种 | 步兵、枪兵、骑兵、弓兵、军师、指挥 + 11 类敌军 |
| 战法 | 34 个，单体/范围/全军/治疗/增益/控制/火攻/箭雨 |
| 装备 | 17 件，兵器/防具/坐骑/宝物，4 套套装 |
| 内政 | 6 种建筑、征兵、赈济、巡查、修城、太守 |
| 科技 | 兵法/农政/工造，共 12 节点 |
| 外交 | 赠礼、结盟、停战、破盟 |
| 战斗 | 12×9、行动序、反击、夹击、高低差、火场、天气、增援、Boss |
| 成就 | 12 个 |
| 典故 | 8 篇 |
| 事件 | 8 个随机事件 |
| 存档 | 4 档 + 自动存档 + JSON 导出/导入 |
| 难度 | 休闲 / 普通 / 史诗 |
| 移动端 | 竖屏 / 横屏 / 触控 / 小地图 / 目标卡片 |

---

## 操作

### 桌面

| 操作 | 功能 |
|---|---|
| 左键 | 选择武将 / 格子 |
| 拖拽 | 旋转视角 |
| 滚轮 | 缩放 |
| `Space` | 待机 |
| `Esc` | 取消 / 暂停 |
| `A` | 自动战斗 |
| `Z` | 撤回移动 |
| `1~4` | 移动 / 攻击 / 战法 / 待机 |

### 手机

- 单指拖动：平移
- 双指：缩放
- 点武将 / 格子：选择
- 点「攻击 / 战法」：目标卡片
- 点左上角回合条：行动序
- 点右下角「城池」：城池面板

---

## AI 生成说明

| 内容 | 生成方式 |
|---|---|
| 47 张武将立绘 | MiniMax H3 text-to-image |
| 53 个全身单位 | H3 绿幕全身图 + 色键抠图 |
| 17 件道具图标 | H3 text-to-image |
| 6 个建筑图标 | H3 text-to-image |
| 11 张地形纹理 | H3 text-to-image |
| 3 个植被/岩石精灵 | H3 + 抠图 |
| 5 张战场背景 | H3 text-to-image |
| 3 段剧情视频 | H3 image-to-video |
| 3 段 Boss 视频 | H3 image-to-video |
| 1 段主菜单视频 | H3 text-to-video |
| 代码 / UI / 程序化音频 | DeepSeek Flash 辅助生成与迭代 |

- 所有生成资产已包含在仓库中，**运行游戏不需要 AI 服务**。
- 重新生成需要局域网 H3 agent 服务，脚本在 `tools/`。
- 生成模型/服务条款以 MiniMax 官方为准；本项目仅做非商业技术验证。
- 详细资产清单、提示词与重建方式见 **[docs/ASSETS.md](docs/ASSETS.md)**。

---

## 技术栈

- **Three.js r128**：3D 战场、相机、粒子、精灵
- **原生 JavaScript / CSS / Canvas 2D**：无框架、无构建步骤
- **WebAudio**：程序化音乐/音效
- **localStorage**：存档
- **纯静态资源**：可直接放 GitHub Pages
- **无后端、无数据库、无追踪、无广告**

---

## 项目结构

```text
three-kingdoms-slg/
├── index.html                 # 多文件网页入口（GitHub Pages 使用）
├── 烽火三国.html              # 单文件离线版（约 40 MB）
├── css/style.css              # 视觉系统与响应式
├── js/
│   ├── three.min.js           # Three.js r128
│   ├── data.js                # 武将/城池/战法/装备/章回数据
│   ├── audio.js               # WebAudio 音乐/音效
│   ├── art.js                 # 立绘/纹理/绘景/图标加载
│   ├── core.js                # 状态/内政/外交/科技/存档
│   ├── ui.js                  # 弹窗/剧情/名册/图鉴
│   ├── campaign.js            # 大地图/城池/回合
│   ├── battle.js              # 战棋战斗/自动战斗
│   └── main.js                # 启动/主菜单
├── assets/
│   ├── manifest.js            # 生成资产清单
│   └── generated/             # 立绘/单位/道具/建筑/地形/背景/视频
├── docs/
│   ├── GAMEPLAY.md            # 完整玩法说明
│   ├── ASSETS.md              # AI 资产与生成流程
│   ├── DEPLOYMENT.md          # GitHub Pages / 本地部署
│   └── ROADMAP.md             # 3A 差距与后续路线
├── tools/
│   ├── build_assets_manifest.py
│   ├── generate_h3_*.py       # H3 图像/视频生成脚本
│   └── legacy/                # 旧 A1111 脚本（可选）
├── screenshots/
├── LICENSE                    # 代码 MIT
└── LICENSE-ASSETS             # 生成素材 CC BY-NC 4.0
```

---

## 部署到 GitHub Pages

最简单的方式：

1. 新建 GitHub 仓库，把本目录推送到 `main`。
2. 仓库 **Settings → Pages**。
3. **Build and deployment → Source** 选择 **Deploy from a branch**。
4. Branch 选择 `main`，目录选择 `/ (root)`。
5. 保存后访问 `https://<username>.github.io/<repo>/`。

也可以使用已提供的 Actions 工作流 `.github/workflows/pages.yml`。

> 必须使用 `index.html`，不要用 `file://` 打开后直接分享链接。  
> 仓库约 95 MB，单文件最大约 40 MB，低于 GitHub Pages 限制。  
> 详细说明见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

---

## 已知边界

- 这是 Demo，不是 3A 商业游戏。
- 单位是 2D 全身立绘 + 程序补间，没有 3D 骨骼动画。
- 音频是程序化 WebAudio，没有配音/管弦乐。
- 内容规模为 6 章垂直切片，不是完整长篇。
- AI 生成素材可能有瑕疵；可自行替换为非商业素材。
- 移动端视频会回退静态图，可在设置中开启「精简模式」。

更多见 [docs/ROADMAP.md](docs/ROADMAP.md)。

---

## 许可证

- **代码**：MIT，见 [LICENSE](LICENSE)
- **AI 生成图片/视频**：CC BY-NC 4.0，见 [LICENSE-ASSETS](LICENSE-ASSETS)
- **Three.js**：MIT
- 本项目为**非商业**同人技术 Demo；不得用于商业用途。

---

## 致谢

- **DeepSeek Flash**：代码、系统设计、文档与迭代
- **MiniMax H3**：武将/单位/道具/建筑/地形/背景/视频生成
- **Three.js**：3D 渲染
- 《三国演义》与汉末历史：故事与人物原型

---

**如果这个 Demo 对你有帮助，欢迎 star、提 issue，或替换成你自己的非商业 AI 资产。**
