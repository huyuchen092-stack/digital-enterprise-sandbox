# 百度可搜索部署说明

目标：让队友可以通过公网访问，并让百度有机会收录“数智化企业经营沙盘智能推演平台”。

## 1. 必要条件

百度不能收录本地地址：

```text
http://127.0.0.1:5173/
http://localhost:5173/
```

必须满足：

- 有公网域名，例如 `https://sandbox.example.com/`。
- 前端静态文件部署到公网服务器或静态托管平台。
- 后端 API 部署到公网服务器，或前端通过反向代理访问后端。
- HTTPS 可访问。
- `robots.txt` 和 `sitemap.xml` 使用真实域名。

## 2. 当前已做的 SEO 基础

前端已经添加：

- 页面标题：数智化企业经营沙盘智能推演平台。
- 描述：规则解析、市场分析、预算校验、Y1-Y4 决策辅助。
- 关键词：数智化企业经营沙盘、企业经营沙盘、沙盘模拟、方案推演、市场分析、广告顺位、现金流预算、产线决策。
- `robots.txt`。
- `sitemap.xml`。
- 结构化数据 `SoftwareApplication`。

上线前必须把以下文件中的 `https://example.com/` 替换成真实域名：

- `frontend/public/robots.txt`
- `frontend/public/sitemap.xml`

## 3. 推荐部署结构

```text
https://你的域名/
  -> 前端 dist 静态文件

https://你的域名/api/
  -> 反向代理到 FastAPI 后端 127.0.0.1:8000
```

前端构建命令：

```bash
cd frontend
npm run build
```

后端启动命令：

```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## 4. 百度收录步骤

1. 部署公网网站并确认 HTTPS 可访问。
2. 打开百度搜索资源平台：`https://ziyuan.baidu.com/`。
3. 添加站点并完成站点验证。
4. 进入资源提交，提交首页 URL。
5. 提交 sitemap，例如：

```text
https://你的域名/sitemap.xml
```

百度会处理提交链接，但不保证一定收录。收录速度取决于站点可访问性、内容质量、页面稳定性和百度抓取情况。

## 5. 队友访问方式

短期局域网测试：

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

队友访问：

```text
http://你的电脑局域网IP:5173/
```

注意：局域网访问不能被百度搜索到，只适合临时测试。
