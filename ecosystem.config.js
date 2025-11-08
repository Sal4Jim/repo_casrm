module.exports = {
  apps: [
    {
      name: 'repo_casrm',
      script: 'cmd',           // El script ahora es la terminal de Windows
      args: '/c "npm run dev"',  // Argumento: /c "ejecuta este comando"
      interpreter: 'none',     // No intentes usar Node.js para leer 'cmd'
      exec_mode: 'fork'
    }
  ]
};