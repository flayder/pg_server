module.exports = {
    apps: [
      {
        name: 'ttop',
        script: './server.js',
        watch: true,
        exec_mode: 'fork',
        ignore_watch: ['node_modules', 'uploads', 'public', 'tmp'], // Исключаем папку uploads
        env: {
          NODE_ENV: 'development'
        },
        env_production: {
          NODE_ENV: 'production'
        }
      }
    ]
  };