# 张刀宋个人网站

这是一个使用 React + Vite 构建的单页个人网站，React 源码位于 `app/`。

首页、作品、切片、关于和联系组成连续长页面，可自然滚动浏览，也可点击导航定位。滚动会同步当前导航与地址，不新增历史记录；作品详情保留独立展示，返回时恢复原来的浏览位置。背景采用多层视差，点击导航时叠加不拦截操作的模糊到清晰过渡，保留原有内容入场与封面展开动作；系统开启“减少动态效果”后关闭这些动态效果。

## 本地开发

```bash
npm install
npm run dev
```

## 构建与更新发布文件

```bash
npm run build
npm run check
npm run promote
```

`npm run build` 只会把构建结果写入被 Git 忽略的 `.site-build/` 隔离目录，不清空目录；`npm run promote` 会先校验构建结果，再只复制以下四个明确文件到仓库根目录：

- `index.html`
- `assets/site.js`
- `assets/site.css`
- `assets/site.jpg`

这样既能保留 React + Vite 的开发体验，也能继续使用当前 GitHub Pages 从 `main` 分支根目录发布的方式。

《沉没成本》作为首页精选与作品区首项展示，独立观影页为 `#work-film`。网页使用 2026-10-26 的润色轻量成片：约 5.84 MB、960×540 / 25fps、H.264 + AAC，播放索引前置，点击后播放；同时提供带手机触控按钮的 HTML 动画版与直接视频链接。版本参数避免旧视频缓存。影片、HTML 与截图保存在 `public/media/sunk-cost/`，构建后由 promote 按明确文件名同步到根目录 `media/sunk-cost/`。`npm run check` 会验证 MP4 索引位置、体积和源文件一致性。高码率母版与影片工程保持本地原样。

「张刀宋净化」位于作品区第二项，介绍与下载页为 `#work-qingping`，涵盖功能、适用系统、安装配置、权限说明和使用限制。0.2.3 APK 与文字说明保存在 `public/downloads/zhangdaosong/`，通过原有 build / check / promote 流程同步到根目录 `downloads/zhangdaosong/`。校验会核对 APK 的已验证 SHA-256；签名私钥、手机数据和本地调试材料不进入网站。

## 浏览器回归

先运行 `npm run preview -- --host 127.0.0.1 --port 4175 --strictPort`，再在另一终端运行：

```bash
node scripts/check-navigation.mjs http://127.0.0.1:4175
```

检查使用已有的 Playwright 安装。若不在项目依赖中，可用 `PLAYWRIGHT_MODULE` 环境变量指定该包的绝对路径；可用 `PLAYWRIGHT_CHANNEL=msedge` 使用已安装的 Edge，无需修改网站依赖。覆盖路由切换、连续滚动、视差、遮罩中断、返回前进、焦点、滚动恢复、响应式及减少动态效果。测试使用独立浏览器上下文，只访问本地预览。
