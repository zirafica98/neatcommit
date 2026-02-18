/**
 * Fix Duplicate Usernames Script
 * 
 * Rešava duplikate username-a pre migracije
 * 
 * Usage: node scripts/fix-duplicate-usernames.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicates() {
  try {
    console.log('🔍 Checking for duplicate usernames...');

    // Pronađi sve duplikate username-a
    const duplicates = await prisma.$queryRaw`
      SELECT username, COUNT(*) as count
      FROM users
      GROUP BY username
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length === 0) {
      console.log('✅ No duplicate usernames found!');
      return;
    }

    console.log(`\n⚠️  Found ${duplicates.length} duplicate username(s):`);
    duplicates.forEach((dup) => {
      console.log(`   - "${dup.username}": ${dup.count} occurrences`);
    });

    // Za svaki duplikat, zadrži najstariji i dodaj suffix ostalima
    for (const dup of duplicates) {
      const users = await prisma.user.findMany({
        where: { username: dup.username },
        orderBy: { createdAt: 'asc' },
      });

      console.log(`\n📝 Fixing duplicates for "${dup.username}":`);
      console.log(`   Keeping: ${users[0].id} (created: ${users[0].createdAt})`);

      // Ažuriraj ostale sa unique username-om
      for (let i = 1; i < users.length; i++) {
        const newUsername = `${dup.username}-${i}`;
        let finalUsername = newUsername;
        let counter = 1;

        // Proveri da li novi username već postoji
        // Koristi findFirst jer username još nije unique constraint
        while (await prisma.user.findFirst({ where: { username: finalUsername } })) {
          finalUsername = `${newUsername}-${counter}`;
          counter++;
        }

        await prisma.user.update({
          where: { id: users[i].id },
          data: { username: finalUsername },
        });

        console.log(`   Updated: ${users[i].id} -> "${finalUsername}"`);
      }
    }

    // Proveri i email duplikate
    console.log('\n🔍 Checking for duplicate emails...');
    const emailDuplicates = await prisma.$queryRaw`
      SELECT email, COUNT(*) as count
      FROM users
      WHERE email IS NOT NULL
      GROUP BY email
      HAVING COUNT(*) > 1
    `;

    if (emailDuplicates.length > 0) {
      console.log(`\n⚠️  Found ${emailDuplicates.length} duplicate email(s):`);
      emailDuplicates.forEach((dup) => {
        console.log(`   - "${dup.email}": ${dup.count} occurrences`);
      });

      // Za svaki email duplikat, zadrži najstariji i obriši email ostalima
      for (const dup of emailDuplicates) {
        const users = await prisma.user.findMany({
          where: { email: dup.email },
          orderBy: { createdAt: 'asc' },
        });

        console.log(`\n📝 Fixing duplicates for email "${dup.email}":`);
        console.log(`   Keeping: ${users[0].id} (created: ${users[0].createdAt})`);

        // Obriši email ostalima (postavi na null)
        for (let i = 1; i < users.length; i++) {
          await prisma.user.update({
            where: { id: users[i].id },
            data: { email: null },
          });

          console.log(`   Removed email from: ${users[i].id}`);
        }
      }
    } else {
      console.log('✅ No duplicate emails found!');
    }

    console.log('\n✅ All duplicates fixed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Mark migration as applied:');
    console.log('      npx prisma migrate resolve --applied 20260216183149_add_password_and_admin_role');
    console.log('   2. Run migration again:');
    console.log('      npx prisma migrate dev');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicates();
