/**
 * Add Password Script
 * 
 * Dodaje password postojećem korisniku
 * 
 * Usage: node scripts/add-password.js <username> <password>
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function addPassword() {
  const username = process.argv[2];
  const password = process.argv[3];
  
  if (!username || !password) {
    console.error('❌ Usage: node scripts/add-password.js <username> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters long');
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
    });

    if (!user) {
      console.error(`❌ User "${username}" not found`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Ažuriraj korisnika
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log(`✅ Password added for user "${user.username}"`);
    console.log(`   You can now login with username: ${user.username}`);
    console.log(`   Password: ${password}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addPassword();
