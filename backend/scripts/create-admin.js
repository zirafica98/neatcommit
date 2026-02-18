/**
 * Create Admin User Script
 * 
 * Kreira admin korisnika sa password-om
 * 
 * Usage: node scripts/create-admin.js <username> <email> <password>
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createAdmin() {
  const username = process.argv[2] || 'admin';
  const email = process.argv[3] || 'admin@example.com';
  const password = process.argv[4] || 'Admin123!';

  if (!password || password.length < 8) {
    console.error('❌ Password must be at least 8 characters long');
    process.exit(1);
  }

  try {
    // Proveri da li korisnik već postoji
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
        ],
      },
    });

    if (existingUser) {
      console.error(`❌ User with username "${username}" or email "${email}" already exists`);
      console.log('\nTo set existing user as admin, use:');
      console.log(`  npm run set-admin ${existingUser.username}`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kreiraj admin korisnika
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        name: 'Admin User',
      },
    });

    console.log(`✅ Admin user created successfully!`);
    console.log(`\n📝 Credentials:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${user.role}`);
    console.log(`\n🚀 Next steps:`);
    console.log(`   1. Go to http://localhost:4200/auth/login`);
    console.log(`   2. Login with username: ${user.username}`);
    console.log(`   3. Password: ${password}`);
    console.log(`   4. You should see "Admin" link in navigation`);
    console.log(`   5. Visit /admin route`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P2002') {
      console.error(`   User with username "${username}" or email "${email}" already exists`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
