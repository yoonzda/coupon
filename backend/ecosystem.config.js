// PM2 ecosystem.config.js — 옹진관광 쿠폰 플랫폼
// 서버: 121.125.61.114
// 사용법: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [{
    name: 'ongjin-backend',
    script: 'src/app.js',
    cwd: '/root/ongjin-coupon',
    instances: 2,                // CPU 코어 수에 맞게 조정
    exec_mode: 'cluster',
    watch: false,
    env: {
      NODE_ENV: 'development',
      PORT: 3010,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3010,
    },
    error_file: '/root/ongjin-coupon/logs/pm2-error.log',
    out_file:   '/root/ongjin-coupon/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '512M',
    restart_delay: 3000,
  }]
}
