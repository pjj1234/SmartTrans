// PM2 进程管理配置
// 用法：pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'smarttrans',
      cwd: './server',
      script: 'src/index.ts',
      interpreter: './server/node_modules/.bin/tsx',
      env: {
        NODE_ENV: 'production',
        PORT: '28123',
      },
      // 日志
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      // 崩溃自动重启
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // 内存保护
      max_memory_restart: '500M',
      // 优雅关闭
      kill_timeout: 15000,
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
}
