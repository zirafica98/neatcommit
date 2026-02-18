/**
 * Check User Script
 * 
 * Proverava da li korisnik postoji i da li ima password
 * 
 * Usage: node scripts/check-user.js <username>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const username = process.argv[2];
  
  if (!username) {
    console.error('❌ Usage: node scripts/check-user.js <username>');
    process.exit(1);
  }

  try {
    // Pronađi korisnika
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        password: true,
        githubId: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.log(`❌ User "${username}" not found`);
      console.log('\nAvailable users:');
      const allUsers = await prisma.user.findMany({
        select: { username: true, email: true, role: true },
        take: 10,
      });
      allUsers.forEach((u) => {
        console.log(`  - ${u.username} (${u.email || 'no email'}) [${u.role}]`);
      });
      process.exit(1);
    }

    console.log(`✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Has Password: ${user.password ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   GitHub ID: ${user.githubId || 'N/A'}`);
    console.log(`   Created: ${user.createdAt}`);

    if (!user.password) {
      console.log('\n⚠️  This user does not have a password!');
      console.log('   They can only login via GitHub OAuth.');
      console.log('   To add password, use:');
      console.log('   node scripts/add-password.js ' + user.username + ' <new-password>');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
