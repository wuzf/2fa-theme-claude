# Claude for 2FA

这是 [wuzf/2fa](https://github.com/wuzf/2fa) 项目的主题，不能单独运行：需要先部署 2FA（2.0.0 或更高版本），再在 **设置 → 外观与主题 → 主题 → 社区主题** 中安装。

为 2FA Manager 制作的 Claude 风格主题。暖纸白、陶土橙、衬线标题与细边框；左侧是像对话列表一样的服务侧栏，右侧是居中的阅读栏，账户逐条排列。提供配套深色模式。使用系统字体，不下载外部资源。

## 安装

需要 **2FA Manager 2.0.0 或更高版本**，支持主题 API 2 / SDK API 1。

1. 在 2FA 中打开「管理 → 设置 → 外观与主题」。
2. 在「主题 → 社区主题」中安装 Claude；也可以运行 `npm ci` 和 `npm run build`，导入本项目构建出的 `dist/2fa-theme.zip`。
3. 选择 **Claude**，查看预览后点击「应用外观」。按主程序提示确认并刷新。

ZIP 是可直接导入的完整主题包，不要上传源码目录压缩包。浅色、深色和跟随系统使用主程序的显示偏好。

## 外观与功能

- 主界面以卡片为主，默认只有扫码、管理、视图三个功能入口；手动添加、工具、备份和设置收在管理页，账户编辑等收在卡片菜单。
- 暖纸白 / 炭灰背景、陶土橙强调色，宿主弹窗及登录、初始化、公开 OTP 页面配套着色。
- 两个主题设置：舒适 / 紧凑密度（紧凑保持同样的阅读栏，只收紧留白）、衬线标题开关。
- 手机上向下滚动时，搜索框留在顶部。
- 搜索、服务筛选、分组、排序、当前与下一验证码复制、HOTP、二维码及账户编辑等继续使用宿主 SDK。
- 沿用宿主 15 种语言与个人品牌设置，支持手机布局、键盘焦点、减少动态效果和系统高对比模式。
- 不计算或存储账户密钥，不自建认证、备份或 Service Worker。

这是 Claude 风格的社区主题，与 Anthropic 无隶属关系；未使用其专有字体或官方品牌素材。

## 开发

需要 Node.js 20+。

```powershell
npm ci
npm run dev
```

打开 `http://127.0.0.1:4199/`。开发页使用合成账户与固定演示时钟，操作仅记录 SDK 调用，不写入实际账户。`PORT` 可更改端口。支持 `?scheme=dark`、`?density=compact`、`?count=0`、`?longBrand=1`、`?lang=en` 和 `?serif=false` 检查布局。

```powershell
npm test
$env:HOST_ROOT = '../2fa'
npm test
npm run build
npm run test:host
npm run format:check
```

未设置 `HOST_ROOT` 时，真实主机 SDK 和导入往返测试会跳过。设置后使用主项目实际代码验证。构建输出可用 `node scripts/build.js --out-dir <目录>` 指定，默认 `dist/`；ZIP 包括文件哈希清单与 `public-appearance.json`。

测试临时输出写在当前进程的 `TEMP` / `TMP` 下。

## 文件

- `src/theme.js`：挂载、账户交互、导航和清理。
- `src/styles/`：只作用于 `.claude-theme` 的样式。
- `src/hostAppearance.js`：宿主弹窗与公共页面共用的配色数据。
- `theme.config.js`：主题身份、版本与可配置项。

代码基于现有 Pixel 主题的 MIT 账户适配层，署名保留在 `licenses/Pixel-adapter-MIT.txt`；完整说明见 [NOTICE.md](NOTICE.md)。
