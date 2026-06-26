// PM2 进程管理配置
// 用法：在项目根目录执行 pm2 start ecosystem.config.cjs
const path = require('path')
const isWin = process.platform === 'win32'

module.exports = {
  apps: [
    {
      name: 'smarttrans',
      cwd: path.resolve(__dirname, 'server'),
      script: 'src/index.ts',
      interpreter: isWin
        ? path.resolve(__dirname, 'server/node_modules/.bin/tsx.cmd')
        : path.resolve(__dirname, 'server/node_modules/.bin/tsx'),
      env: {
        NODE_ENV: 'production',
        PORT: '28123',
      },
      // 日志
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: path.resolve(__dirname, 'logs/error.log'),
      out_file: path.resolve(__dirname, 'logs/out.log'),
      merge_logs: true,
      // 崩溃自动重启
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // 内存保护
      max_memory_restart: '500M',
      // 优雅关闭
      kill_timeout: 15000,
      listen_timeout: 10000,
    },
  ],
}
