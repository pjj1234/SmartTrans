#!/usr/bin/env bash
set -euo pipefail

# ===== SmartTrans 部署脚本 =====

echo "===== 1/5 拉取最新代码 ====="
git pull

echo "===== 2/5 安装依赖 ====="
npm run install:all

echo "===== 3/5 构建前端 ====="
npm run build

echo "===== 4/5 重建知识库 ====="
npm run rag:ingest

echo "===== 5/5 重启服务 ====="
if pm2 list | grep -q smarttrans; then
  pm2 restart ecosystem.config.cjs
else
  pm2 start ecosystem.config.cjs
fi

echo "===== 健康检查 ====="
sleep 2
curl -s "http://localhost:28123/api/health" || echo "健康检查未通过，请检查日志"

pm2 status
echo ""
echo "部署完成！"
echo "访问地址: http://$(hostname -I 2>/dev/null || echo '服务器IP'):28123"
