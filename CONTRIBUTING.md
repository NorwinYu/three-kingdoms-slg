# Contributing

这是一个非商业 AI 生成技术 Demo。欢迎提交 bug、体验建议、代码优化和非商业美术替换。

## 原则

- 不提交商业素材、盗版素材或来源不明的图片/音频。
- 新增图片/视频请放到 `assets/generated/`，并在 `docs/ASSETS.md` 说明生成方式。
- 代码变更请尽量保持纯前端、离线可运行，不引入必须联网的运行时依赖。
- 不把项目用于商业发行、付费下载或商业广告。

## 本地开发

```bash
python3 -m http.server 8080
# http://127.0.0.1:8080/
```

## 重建单文件版

```bash
python3 tools/build_assets_manifest.py
```

## 提交

请附上复现步骤、截图和浏览器/设备信息。战斗改动请说明是否影响自动战斗与移动端。
