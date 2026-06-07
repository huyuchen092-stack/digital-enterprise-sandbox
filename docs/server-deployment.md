# 服务器部署手册

目标：拿到一台 Linux 服务器后，用 Docker 一键部署数智化企业经营沙盘智能体。

## 1. 服务器要求

建议配置：

- Ubuntu 22.04 或 Debian 12。
- 1 核 1G 可测试，2 核 2G 更稳。
- 开放 80/443 端口；临时测试可开放 8000。
- 已安装 Docker 和 Docker Compose。

## 2. 拉取项目

```bash
git clone https://github.com/huyuchen092-stack/digital-enterprise-sandbox.git
cd digital-enterprise-sandbox
```

## 3. 配置环境变量

```bash
cp .env.production.example .env.production
nano .env.production
```

填写：

```env
DEEPSEEK_API_KEY=你的 DeepSeek Key
```

默认使用 SQLite，数据和上传文件会保存到 Docker volume `sandbox_data`。

## 4. 启动

```bash
docker compose up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f sandbox-ai
```

访问：

```text
http://服务器IP:8000/
http://服务器IP:8000/health
```

## 5. 绑定域名

如果使用 Nginx：

1. 将 `deploy/nginx.conf.example` 复制到服务器 Nginx 配置目录。
2. 把 `your-domain.com` 替换成真实域名。
3. 确认 Nginx 代理到 `127.0.0.1:8000`。
4. 用 Certbot 配 HTTPS。

示例：

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/sandbox-ai
sudo ln -s /etc/nginx/sites-available/sandbox-ai /etc/nginx/sites-enabled/sandbox-ai
sudo nginx -t
sudo systemctl reload nginx
```

## 6. 更新部署

```bash
git pull
docker compose up -d --build
```

## 7. 数据备份

SQLite 和上传文件在 Docker volume 中。

查看 volume：

```bash
docker volume ls
```

备份建议：

```bash
docker run --rm -v digital-enterprise-sandbox_sandbox_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/sandbox-data-backup.tar.gz /data
```

## 8. 百度收录

绑定域名后，把以下文件中的 `https://example.com/` 替换成真实域名：

- `frontend/public/robots.txt`
- `frontend/public/sitemap.xml`

然后重新部署，并到百度搜索资源平台提交站点和 sitemap。

## 9. 常见问题

### 首次构建慢

前端 npm 包和 Python 依赖都要下载，第一次构建慢是正常的。

### 上传文件丢失

不要删除 Docker volume `sandbox_data`。如果你使用免费云平台的临时文件系统，上传文件可能丢失；服务器 Docker volume 更稳。

### DeepSeek 调不通

检查：

- `.env.production` 中 `DEEPSEEK_API_KEY` 是否填写。
- 服务器是否能访问 `https://api.deepseek.com`。
- Render/其他云平台是否正确设置环境变量。
