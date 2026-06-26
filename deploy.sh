#!/usr/bin/env bash
set -euo pipefail

# ===== SmartTrans 部署脚本 =====

echo "===== 1/4 安装依赖 ====="
npm run install:all

echo "===== 2/4 构建前端 ====="
npm run build

echo "===== 3/4 重建知识库 ====="
npm run rag:ingest

echo "===== 4/4 重启服务 ====="
pm2 delete smarttrans 2>/dev/null || true
pm2 start ecosystem.config.cjs

echo "===== 健康检查 ====="
sleep 2
curl -s "http://localhost:28123/api/health" || echo "健康检查未通过，请检查日志"

pm2 status
echo ""
echo "部署完成！"
echo "访问地址: http://$(hostname -I 2>/dev/null || echo '服务器IP'):28123"
