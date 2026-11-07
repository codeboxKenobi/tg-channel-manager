module.exports = {
  apps: [
    {
      name: 'tg-channel-manager',
      script: '.output/server/index.mjs',
      env: {
        PORT: 8080,
        NODE_ENV: 'production'
      }
    }
  ]
};
