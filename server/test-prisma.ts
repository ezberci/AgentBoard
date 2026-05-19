import "./src/lib/config.js";
import { prisma } from './src/prisma/client.js';
async function main() {
  const projects = await prisma.project.findMany();
  console.log('Projects:', projects.length);
  const tasks = await prisma.task.findMany();
  console.log('Tasks:', tasks.length);
  await prisma.$disconnect();
}
main();
