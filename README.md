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
npm run promote
```

`npm run build` 只会把构建结果写入被 Git 忽略的 `.site-build/` 隔离目录；`npm run promote` 会先校验构建结果，再只复制以下三个明确文件到仓库根目录：

- `index.html`
- `assets/site.js`
- `assets/site.css`

这样既能保留 React + Vite 的开发体验，也能继续使用当前 GitHub Pages 从 `main` 分支根目录发布的方式。
