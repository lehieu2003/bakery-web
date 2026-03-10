const { execSync } = require('child_process');

console.log('Running prisma generate...');
execSync('npx prisma generate', { stdio: 'inherit', cwd: '/vercel/share/v0-project' });
console.log('Prisma client generated successfully.');
