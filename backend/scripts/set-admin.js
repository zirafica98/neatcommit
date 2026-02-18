/**
 * Set Admin User Script
 * 
 * Postavlja korisnika kao admina
 * 
 * Usage: node scripts/set-admin.js <username>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setAdmin() {
  const username = process.argv[2]; // Username iz command line
  
  if (!username) {
    console.error('❌ Usage: node scripts/set-admin.js <username>');
    console.error('   Example: node scripts/set-admin.js john-doe');
    process.exit(1);
  }

  try {
    // Pronađi korisnika
    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!existingUser) {
      console.error(`❌ User "${username}" not found`);
      console.log('\nAvailable users:');
      const allUsers = await prisma.user.findMany({
        select: { username: true, email: true, role: true },
        take: 10,
      });
      allUsers.forEach((user) => {
        console.log(`  - ${user.username} (${user.email || 'no email'}) [${user.role}]`);
      });
      process.exit(1);
    }

    if (existingUser.role === 'ADMIN') {
      console.log(`ℹ️  User "${username}" is already an ADMIN`);
      process.exit(0);
    }

    // Postavi kao admina
    const user = await prisma.user.update({
      where: { username },
      data: { role: 'ADMIN' },
    });

    console.log(`✅ User "${user.username}" is now an ADMIN`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Logout from the application');
    console.log('   2. Login again through GitHub OAuth');
    console.log('   3. You should see "Admin" link in navigation');
    console.log('   4. Visit /admin route');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P2025') {
      console.error(`   User "${username}" not found`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setAdmin();
