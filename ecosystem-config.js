module.exports = {
  apps: [
    {
      name: "Discord CW Bot",
      script: "./index.js",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};