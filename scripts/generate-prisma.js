import { execSync } from 'child_process';

console.log('Running prisma generate...');
execSync('npx prisma generate', { stdio: 'inherit' });
console.log('Prisma client generated successfully.');
