# 私密留言接收端

这是网站的服务端接收接口，替代可直接投递的 Formspree 地址。2026-11-04 已确认账户为 Free 并部署，密钥只保存在 Cloudflare secrets；修复 SMTP 连接后已通过云端真实发信测试，网页正常提交、QQ 实际收件与关闭旧表单仍需验收。

## 已实现的规则

- 同一来源 IP 每个自然日最多 3 次有效验证后的投递尝试，两次至少间隔 60 秒；以北京时间零点为界。
- 全站每天最多 20 次投递尝试，避免换 IP 集中刷信。超限返回 HTTP 429，带 Retry-After，不调用 SMTP。
- 在 Cloudflare 边缘读取 CF-Connecting-IP，不信任 X-Forwarded-For；计数以 SQLite Durable Object 的事务原子更新，实例重启不会清零。
- 服务端核验 Turnstile token、hostname 和 private-message action。仅检查网页、Referer 或 Origin 都不能替代此校验。
- 只允许发到 SMTP_USER 自己，访客不能指定收件人、SMTP 主机或发件人。使用 smtp.qq.com:465 的 TLS，保持证书验证。
- SMTP 超时可能意味着邮件已经被接受，因此不退还已经预留的次数；失败也可能占用当天次数。正文不在 Worker 存储中保存。只保存当前日 HMAC 化的 IP 标识与计数，不写入原始 IP，不记录留言和密钥。

## 零付费边界

选择 Cloudflare Workers **Free**，使用免费支持的 SQLite Durable Objects。不要开通 Workers Paid 或任何付费附加项。免费额度超出时请求失败，不自动转为付费续用。Cloudflare 免费额度和 QQ SMTP 的风控限制仍以服务方为准，不能承诺永久可用或不限量。

该方案不要求买域名；Worker 提供 workers.dev 地址，通知使用已有 QQ 邮箱 SMTP，不经过 Formspree 的每月 50 次额度。云端测试发现 Nodemailer 默认预解析 IP 的连接在 Workers 报 ESOCKET；原生主机名 TLS 连接可用，因此通过 getSocket 保留主机名、SNI 与证书验证。使用同一发送模块的远程预览已成功发出一封测试邮件；这不能替代网页正常通过验证码提交和 QQ 实际收件的验收。

## 部署步骤（不要把任何密钥发到聊天或提交 Git）

在本目录打开终端：

```powershell
npm install
npx wrangler login --device --browser=false --scopes account:read user:read workers_scripts:write --use-keyring
npx wrangler whoami
```

登录授权需由账户本人完成，凭据保存在操作系统钥匙环中。核对登录账户及 Workers Free 计划。QQ 邮箱网页版 → 设置 → 账户中开启 SMTP 服务并生成专用授权码（不是 QQ 密码）。然后逐项使用交互输入配置，值不会写入网站源码：

如果两种 OAuth 登录都出现 `No CSRF value available in the session cookie`，可改用 Cloudflare 官方支持的用户 API Token：My Profile → API Tokens → Create Token → Custom Token。权限只给所选账户的 Workers Scripts/Edit、Account Settings/Read，以及 User Details/Read；账户资源仅选实际部署账户。建议设置短有效期。不要创建 Global API Key，不授予 Billing/Edit。

在 PowerShell 中运行 `& 'D:\personal web\xuedingeri.github.io\message-worker\Save-CloudflareToken.ps1'`，在隐藏输入中粘贴 Token。脚本仅向 Cloudflare 官方验证接口提交 Token，成功后使用 Windows DPAPI 加密保存在被 Git 忽略的 `.cloudflare-token.dpapi`。不要通过聊天提供 Token。之后可以用 `./Invoke-Wrangler.ps1 whoami`、`./Invoke-Wrangler.ps1 deploy`、`./Invoke-Wrangler.ps1 secret put 名称`；Token 只临时进入命令的进程环境，不写入 Vite 或 Worker 的运行时变量。

加密文件只可由本机同一 Windows 用户解密。它仍属于本地凭据，不能上传仓库或复制进发布文件；过期或撤销后需重新创建 Token 并运行保存脚本。该方式用于部署登录，不替代 SMTP 和 Turnstile 的服务端秘密配置。

也可运行 `Save-MessageSecrets.ps1` 在本机隐藏输入 QQ SMTP 授权码和 Turnstile Secret Key；配置以 DPAPI 加密写入同样被 Git 忽略的 `.message-secrets.dpapi`。IP 哈希密钥首次自动生成，之后保留，以免维护配置时意外重置同 IP 的配额。部署接收端后，由维护者运行 `Publish-MessageSecrets.ps1 -AccountId 实际账户ID` 将四项值直接上传到 Cloudflare Worker secrets；只输出配置项名称，不输出值。此路径和上面的交互式 `wrangler secret put` 二选一即可。

```powershell
npx wrangler secret put SMTP_USER
npx wrangler secret put SMTP_PASSWORD
npx wrangler secret put TURNSTILE_SECRET
npx wrangler secret put IP_HASH_SECRET
```

- SMTP_USER：已有的通知收件 QQ 邮箱，所有邮件只发往该邮箱自身。
- SMTP_PASSWORD：刚生成的专用 SMTP 授权码。
- TURNSTILE_SECRET：与网站现有 Site Key 配对的 Secret Key，保持仅允许 zds36.github.io。
- IP_HASH_SECRET：至少 32 字符的随机密钥；不要使用邮箱密码，不要在上线期间轮换来清空配额。

首次设置 secret 若提示创建同名 Worker，只创建 wrangler.jsonc 中的 between-states-messages，并保持 Free；更完整的做法是先部署未配置密钥、返回 503 的接收端，再添加 secrets。

```powershell
npm test
npm run deploy
```

记录部署返回的 `https://between-states-messages.你的账号.workers.dev`。网站维护者需要将该地址加 `/message` 配入根目录 `.env.local` 的 VITE_MESSAGE_ENDPOINT，重新 build/check/promote 并发布。任何 SMTP/Turnstile Secret/HMAC 密钥都绝不能使用 VITE_ 前缀。后台参数缺失、存储不可用或校验失败时拒绝发送。

## 切换验收

1. 先证明新接口拒绝未验证 token，合法来源和有效验证码可发到邮箱；测试只发必要的少量邮件，不压测 QQ SMTP 或 Turnstile。
2. 确认三次配额后第四次返回 daily_limit 且没有额外发信。可先用本地安全测试核对计数；线上测试会占用当天配额。
3. 发布新网页，确认生产脚本里没有旧 Formspree 表单 ID。
4. 在旧 Formspree 表单 Settings 关闭 **Form Enabled**。旧地址已经公开，光从网页移除它不能封住绕过入口；无需删除表单。
5. 再检查网页显示每日限制、失败保留正文、QQ 收件，确认没有后台或浏览器日志输出秘密。

## 本地验证

`npm test` 包括输入边界、验证码失败/域名/action 不匹配、同 IP 限额、间隔、跨日、发送失败不绕过、全站上限，以及真实 Worker/SQLite 事务的并发和对象重启测试。所有通知发送都由测试替身处理，不会向邮箱发信。

Worker 模式网页测试：开发服务器设置 VITE_MESSAGE_ENDPOINT=https://qa-messages.qa.workers.dev/message，另一个未配置服务器应将该变量显式置空。运行根目录的 `scripts/check-private-message.mjs`，验证码和请求全部在本地拦截。

同一 IP 不等于同一人：共用网络会共用配额，换网络/IPv6 地址可获得另一个 IP；全站上限只能限制损失，不能保证抵御分布式攻击。额度耗尽会暂时拒收，不以自动付费来维持服务。

依据：[Cloudflare 免费 DO 与超额行为](https://developers.cloudflare.com/durable-objects/platform/pricing/)、[Worker TCP 限制](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/)。
