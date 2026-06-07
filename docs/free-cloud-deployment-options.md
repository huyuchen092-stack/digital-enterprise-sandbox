# 免费云部署方案对比

目标：让队友通过公网网址访问数智化企业经营沙盘智能体，并为百度收录做准备。

## 推荐方案 A：Render 一体化部署

适合当前项目。

结构：

```text
Render Web Service
  FastAPI 后端
  └─ 托管 frontend/dist 静态网页
```

优点：

- 一个公网网址即可访问前端和 API。
- 不需要处理跨域。
- 可以直接配置 DeepSeek API key。
- 已提供 `render.yaml`。

限制：

- 免费实例空闲一段时间会休眠，首次访问会慢。
- 免费实例本地文件和 SQLite 不适合长期保存；上传文件、数据库可能在重启后丢失。
- 适合测试、演示、给队友试用；长期稳定比赛系统建议后续换持久化数据库和付费实例。

部署步骤：

1. 把项目推到 GitHub。
2. 登录 Render。
3. 选择 New Web Service 或 Blueprint。
4. 连接 GitHub 仓库。
5. 如果使用 Blueprint，Render 会读取根目录 `render.yaml`。
6. 在环境变量中填写：

```text
DEEPSEEK_API_KEY=你的 DeepSeek Key
```

7. 部署完成后访问 Render 给出的 `https://xxx.onrender.com/`。

## 方案 B：Cloudflare Pages + Render 后端

适合后续正式化。

结构：

```text
Cloudflare Pages -> 前端
Render/Koyeb -> FastAPI 后端
```

优点：

- 前端访问速度好，免费额度高。
- 适合绑定自己的域名。

缺点：

- 需要改前端 API 地址。
- 要处理 CORS 或反向代理。
- 两个平台配置，复杂度更高。

## 方案 C：Koyeb 一体化部署

也可以部署 FastAPI，但当前项目已有 Render 配置，优先 Render。

## 百度收录提醒

百度不能收录本地地址：

```text
http://127.0.0.1:5173/
```

需要公网地址，例如：

```text
https://你的应用.onrender.com/
https://你的域名/
```

上线后：

1. 替换 `frontend/public/robots.txt` 和 `frontend/public/sitemap.xml` 中的 `https://example.com/`。
2. 打开百度搜索资源平台。
3. 添加站点并验证。
4. 提交首页 URL 和 sitemap。
