# 张刀宋个人网站

这是一个使用 React + Vite 构建的单页个人网站，React 源码位于 `app/`。

首页、作品、年轮、关于和联系组成连续长页面，可自然滚动浏览，也可点击导航定位。滚动会同步当前导航与地址，不新增历史记录；作品详情保留独立展示，返回时恢复原来的浏览位置。背景采用多层视差，点击导航时叠加不拦截操作的模糊到清晰过渡，保留原有内容入场与封面展开动作；系统开启“减少动态效果”后关闭这些动态效果。

## 年轮：个人时间树

「年轮」是公开展示的个人动态，按年、月、实际日期从近到远排列。原来的 `#slices` 地址继续有效。

内容集中在 `app/moments.js`。每条包含唯一的 `id`、`date`（`YYYY-MM-DD`）、`title`、`text`、`tag` 和 `photos`。可以随时补写过去任何日期，也可以同一天添加多条；页面会自动归位，同日内容保留文件中的先后顺序。正文使用 `\n` 换行，不解析 HTML。

以后把日期、文字和照片发给网站维护者即可更新。页面不提供在线发布后台；本地改完后仍需构建、检查、更新发布文件并推送 GitHub 才会上线。

添加配图时，把照片放在 `app/photos/`，在内容文件顶部用 `import photoUrl from './photos/文件名.jpg'` 导入，再在对应条目的 `photos` 中填写 `{ src: photoUrl, alt: '真实的图片说明' }`；没有照片就填 `[]`。建议最多九张，照片点击可放大，支持关闭按钮及 Escape。推荐小写英文或数字文件名，格式为 JPG、PNG、WebP、AVIF 或 GIF。配图会随构建自动打包并复制到发布目录，不覆盖头像。

当前三条内容沿用原“切片”；日期沿用 2026 年 9 月 29 日，花朵配图复用本站原有图像。

## 私密留言与邮件通知

联系区提供私密留言，访客可填写称呼、回复邮箱（两者选填）和最多 2000 字正文。内容通过 Formspree 接收并转发，不在网站公开，也不写入浏览器本地存储。收件邮箱只在 Formspree 后台配置，不放进网页源码或 Vite 环境变量。

接通步骤：

1. 在 Formspree 创建表单，设置收件邮箱并完成邮箱验证，确认通知已开启。
2. 将 `.env.example` 复制为 `.env.local`，填写公开表单 ID：`VITE_FORMSPREE_FORM_ID=实际ID`，以及 Cloudflare Turnstile 的公开 `VITE_TURNSTILE_SITE_KEY=实际SiteKey`。两者都不是密码；邮箱密码、SMTP 授权码和 Turnstile Secret Key 绝不能写入 VITE 变量。
3. Cloudflare Turnstile 创建 Managed 模式组件，只允许正式域名 `zds36.github.io`（如更换域名，应同步修改）。Secret Key 只填入 Formspree → 表单 Settings → CAPTCHA → Turnstile，保存并启用 CAPTCHA。Formshield 保持开启。项目 Settings → Restrict to Domain 填 `zds36.github.io`，不带 `https://`。
4. 重新构建并校验，再更新发布文件。未配置 ID 或 Site Key 时留言暂未开放；验证加载失败、未通过或过期时禁止提交，不降级为免验证发送。每次请求后重置验证，失败保留正文。
5. 正式发布前确认 Formspree 后台 CAPTCHA 的确已启用，未带有效 token 的请求不能进入正常留言通知；再通过正常访客验证提交一条留言，确认邮箱收到。前端模拟测试不能证明服务端防护生效。开启域名限制后，本地预览来源会被归入垃圾箱，不能当成正式收件测试。

本地交互检查模拟 CAPTCHA 和提交接口，不会向真实邮箱发送测试消息。在一个仅测试使用的开发终端设置 `VITE_FORMSPREE_FORM_ID=qacheckx`、`VITE_TURNSTILE_SITE_KEY=local-mock-site-key` 并启动 4175 端口开发服务器；另一个终端设置 `VITE_FORMSPREE_FORM_ID=disabled-for-test` 并启动 4177 端口开发服务器，覆盖本机正式配置以验证未接通状态。然后运行 `node scripts/check-private-message.mjs`。这些测试值不应写入 `.env.local` 或正式构建。

也可对已配置的本地正式构建预览运行 `node scripts/check-private-message.mjs http://127.0.0.1:4176 http://127.0.0.1:4177 实际公开表单ID`；所有验证码和投递请求仍由测试拦截模拟，不验证真实服务端状态。

Formspree 是第三方处理方，服务额度与反垃圾设置以其后台为准。尚未创建并验证真实表单时，不能视为已接通邮件通知。

防护边界：Formspree 的表单整体限流为每分钟 20 次 POST，并非本站自行设置的单 IP 配额；网页显示 429 限流提示并保留正文。域名限制依靠 Referer，不能单独阻止伪造请求。Turnstile 必须由 Formspree 服务端核验才有效，也不能完全阻止真人持续恶意留言。若出现这种滥用，需另加服务端按来源限流或暂时关闭表单。不要压测真实投递接口。[Formspree 限制说明](https://help.formspree.io/articles/form-and-project-settings/system-limits)、[Turnstile 接入说明](https://help.formspree.io/articles/form-and-project-settings/protecting-your-forms-with-cloudflare-turnstile)。

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

`npm run build` 只会把构建结果写入被 Git 忽略的 `.site-build/` 隔离目录，不清空目录；`npm run promote` 会先校验构建结果，再复制以下四个文件及构建生成的年轮配图到仓库根目录，不删除旧文件：

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
