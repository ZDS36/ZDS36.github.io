# 张刀宋个人网站

这是一个使用 React + Vite 构建的单页个人网站，React 源码位于 `app/`。

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

## 浏览器回归

先运行 `npm run preview -- --host 127.0.0.1 --port 4175 --strictPort`，再在另一终端运行：

```bash
node scripts/check-navigation.mjs http://127.0.0.1:4175
```

检查使用已有的 Playwright 安装。若不在项目依赖中，可用 `PLAYWRIGHT_MODULE` 环境变量指定该包的绝对路径；无需修改网站依赖。覆盖路由切换、返回前进、焦点、滚动恢复、响应式及减少动态效果。测试使用独立浏览器上下文，只访问本地预览。
