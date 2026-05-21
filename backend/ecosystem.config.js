module.exports = {
  apps: [
    {
      name: "amezing-pay",
      script: "./server.js",
      instances: 1, // ESM ("type":"module") does not support PM2 cluster mode. Use 1 instance with fork.
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "700M", // Restart if app uses > 700MB RAM
      exp_backoff_restart_delay: 100, // Exponential backoff on repeated crashes
      max_restarts: 15, // Stop restart loop after 15 consecutive failures
      min_uptime: "10s", // Must run 10s to be considered "started"
      env_production: {
        NODE_ENV: "production",
        PORT: 4050,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      merge_logs: true,
      autorestart: true,
      restart_delay: 4000, // Wait 4 seconds before restarting
      kill_timeout: 10000, // Give graceful shutdown 10s before SIGKILL
    },
  ],
};
