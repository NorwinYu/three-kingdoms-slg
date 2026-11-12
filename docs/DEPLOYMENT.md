# 部署说明

本项目是**纯静态站点**：没有后端、数据库、构建步骤或运行时 AI 调用。

---

## 1. 本地运行

```bash
cd three-kingdoms-slg
python3 -m http.server 8080
```

打开 `http://127.0.0.1:8080/`。

也可以直接双击 `index.html` 或 `烽火三国.html`。  
但推荐 HTTP，因为浏览器对 `file://` 的视频/纹理行为不完全一致。

---

## 2. GitHub Pages（推荐）

### 方式 A：分支部署

1. 新建仓库，把整个目录推送到 `main`。
2. 进入仓库 **Settings → Pages**。
3. **Build and deployment → Source** 选择 **Deploy from a branch**。
4. Branch 选择 `main`，目录选择 `/ (root)`。
5. 保存，等待 Pages 构建。
6. 访问：

```text
https://<username>.github.io/<repo>/
```

### 方式 B：GitHub Actions

仓库已包含 `.github/workflows/pages.yml`。  
推送到 `main` 后，在 **Settings → Pages → Source** 选择 **GitHub Actions** 即可。

工作流会：

1. checkout 仓库
2. 上传整个目录为 Pages artifact
3. 部署到 GitHub Pages

---

## 3. 仓库体积

当前仓库约 **95 MB**，主要来自：

- `烽火三国.html`：约 40 MB（单文件离线版，含全部图片/视频）
- `assets/generated/`：约 30 MB
- `screenshots/`：约 10 MB

GitHub Pages 单站点限制为 **1 GB**，单文件限制为 **100 MB**，当前均低于限制。

### 想减小仓库

如果不需要离线单文件版，可以删除 `烽火三国.html`，仓库会减少约 40 MB。  
GitHub Pages 只需要 `index.html + css + js + assets`。

> 不建议把视频改成 Git LFS：Pages 对 LFS 支持不稳定；当前文件大小可直接普通提交。

---

## 4. 路径与大小写

- 所有路径均为相对路径。
- GitHub Pages 区分大小写；请保持目录名与文件名一致。
- 不要把 `index.html` 改名；Pages 默认入口是 `index.html`。
- `.nojekyll` 已包含，避免 Jekyll 处理静态资源。

---

## 5. 视频与音频

- 视频通过 `<video>` 播放，GitHub Pages 支持 Range 请求。
- 桌面端播放生成视频；手机端回退静态图。
- 浏览器要求视频 `muted` 才能自动播放，项目已设置。
- 音频由 WebAudio 在首次点击后初始化（浏览器自动播放策略）。

---

## 6. 存档

- 存档在浏览器 `localStorage`，按 origin 隔离。
- GitHub Pages 的 `https://username.github.io/repo/` 与本地 `http://127.0.0.1:8080/` 存档**不共享**。
- 换域名/路径后旧存档不会自动迁移。
- 可在游戏内使用「导出存档 / 导入存档」迁移 JSON。

---

## 7. 自定义域名

在 **Settings → Pages → Custom domain** 填入域名，并按 GitHub 提示配置 DNS。  
项目本身不需要改代码。

---

## 8. 常见问题

### 页面 404

- 确认入口是 `index.html`。
- 确认 Pages 已构建完成。
- 确认分支/目录选择正确。
- 检查文件名大小写。

### 图片/视频不显示

- 确认 `assets/generated/` 已提交。
- 确认 `assets/manifest.js` 已提交。
- 检查浏览器控制台是否有 404。
- 单文件版不需要 `assets/`；网页版需要。

### 视频不自动播放

- 确认浏览器未阻止自动播放；项目已 `muted`。
- 手机端默认使用静态图，这是预期行为。

### 存档丢失

- 清理浏览器数据/换域名会丢失。
- 用 JSON 导出备份。

---

## 9. 开源与非商业

- 代码：MIT
- 生成素材：CC BY-NC 4.0
- 本项目仅用于非商业技术 Demo
- 详见根目录 `LICENSE` 与 `LICENSE-ASSETS`
