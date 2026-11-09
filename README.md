# 张刀宋个人网站

这是一个使用 React + Vite 构建的单页个人网站，React 源码位于 `app/`。

直接打开站点根地址时会播放开场动画，点击「进入网站」进入首页。带 `#` 的章节链接可以直接打开对应页面。开场动画的源文件是 `public/entrance.html`。

首页、作品、年轮、关于和联系组成连续长页面，可自然滚动浏览，也可点击导航定位。滚动会同步当前导航与地址，不新增历史记录。作品详情保留独立展示，返回时恢复原来的浏览位置。背景采用多层视差。点击顶部导航切换栏目时，从当前可用的墨迹晕开、纸张撕裂和碎纸飘散中等概率抽取一种，并播放对应音效。顶部四个栏目的水滴胶囊和内容轻推约 400ms。系统开启“减少动态效果”时直接切换，保持静音。

## 添加导航转场

在 `app/navigation-transitions.js` 的 `transitions` 清单中注册新效果。可参照 `app/ink-transition.js` 或 `app/paper-tear.js`：

- `supports({ stage, main, link })` 判断当前浏览器和页面能否播放该效果。
- `start(context, commit)` 在旧画面准备好后调用 `commit()` 显示目标栏目，并返回 `{ finished, cancel }`。播放完成或取消时清理临时画面，让 `finished` 结束。重复调用 `cancel()` 应安全。

随机选择、连点排队和取消由导航统一处理。若当前没有可用效果，导航会直接切换。

## 年轮：个人时间树

「年轮」是公开展示的个人动态，按年、月、实际日期从近到远排列。原来的 `#slices` 地址继续有效。

内容集中在 `app/moments.js`。每条包含唯一的 `id`、`date`（`YYYY-MM-DD`）、`title`、`text`、`tag` 和 `photos`。可以随时补写过去任何日期，也可以同一天添加多条；页面会自动归位，同日内容保留文件中的先后顺序。正文使用 `\n` 换行，不解析 HTML。

以后把日期、文字和照片发给网站维护者即可更新。页面不提供在线发布后台；本地改完后仍需构建、检查、更新发布文件并推送 GitHub 才会上线。

添加配图时，把照片放在 `app/photos/`，在内容文件顶部用 `import photoUrl from './photos/文件名.jpg'` 导入，再在对应条目的 `photos` 中填写 `{ src: photoUrl, alt: '真实的图片说明' }`；没有照片就填 `[]`。建议最多九张，照片点击可放大，支持关闭按钮及 Escape。推荐小写英文或数字文件名，格式为 JPG、PNG、WebP、AVIF 或 GIF。配图会随构建自动打包并复制到发布目录，不覆盖头像。

当前三条内容沿用原“切片”；日期沿用 2026 年 9 月 29 日，花朵配图复用本站原有图像。

## 私密留言与邮件通知

联系区通过 Cloudflare Worker 接收私密留言，由 QQ SMTP 发到站长自己的邮箱。访客可填写称呼、回复邮箱（两者选填）和最多 2000 字正文；留言不公开，不写入浏览器存储。收件邮箱、SMTP 授权码、Turnstile Secret Key 和 IP 哈希密钥只放 Worker secrets，不能进入网页或 VITE_ 变量。

服务端在验证 Turnstile 的 hostname 与 action 后，以 SQLite Durable Object 事务限制同一 IP 每天 3 次、间隔至少 60 秒、全站每天 20 次，按北京时间零点重置。同一事务保存配额和待发内容，后台重试不增加提交次数。共用网络会共用配额，换 IP 不能被视作同一个人。

部署与凭据保存见 [接收端说明](message-worker/README.md)。`.env.local` 只填写公开的 `VITE_MESSAGE_ENDPOINT`（Worker URL 加 `/message`）和 `VITE_TURNSTILE_SITE_KEY`。配置缺失或错误时禁止提交，不回退旧 Formspree；验证码未通过、过期或加载失败时也禁止发送，提交失败保留正文。

服务器通过验证码与限流检查、将留言保存到私密待发列表后立即返回 202，网页直接显示「发送成功」，不等待 QQ SMTP 回执。后台使用原来已验证的 QQ 发信函数，失败保留内容并退避重试，投递后删除。成功表示服务器已接收；邮件通知可能稍后到达。网络连接错误和超限仍提示失败并保留正文。

连接检查：直接打开 Worker 地址的 `/health` 路径，应显示「留言服务连接正常」。这是只读 HTTP 连通检查，不发送邮件、不验证验证码、不消耗留言配额。主站可以打开不代表留言域名也可达；某个网络或浏览器无法打开检测页时，不能用修改成功提示来解决。网页区分连接失败、验证码拒绝、填写错误、服务不可用与配额限制。

只使用 Workers Free 与现有 QQ 邮箱，不开通付费套餐。旧 Formspree 表单必须在其后台关闭 Form Enabled，否则历史公开地址仍可绕过新接口。真实收件仍需由正常访客完成人机验证后提交确认；前端模拟、本地 SMTP 认证成功都不能替代这一步。

本地交互测试使用 4175 与 4177 两个开发服务器：前者设置 `VITE_MESSAGE_ENDPOINT=https://qa-messages.qa.workers.dev/message`、`VITE_TURNSTILE_SITE_KEY=local-mock-site-key`，后者将这两个变量显式置空。运行 `node scripts/check-private-message.mjs http://127.0.0.1:4175 http://127.0.0.1:4177`。验证码和请求全部在本地拦截，不发送邮件；测试值不能用于正式构建。

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

`npm run build` 只会把构建结果写入被 Git 忽略的 `.site-build/` 隔离目录，不清空目录；`npm run promote` 会先校验构建结果，再复制以下文件及构建生成的年轮配图到仓库根目录，不删除旧文件：

- `index.html`
- `entrance.html`
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
