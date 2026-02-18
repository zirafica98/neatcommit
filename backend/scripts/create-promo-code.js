/**
 * Script za kreiranje promo code-a "KUM" sa 100% popustom
 * 
 * Pokreni: node scripts/create-promo-code.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Proveri da li već postoji
    const existing = await prisma.promoCode.findUnique({
      where: { code: 'KUM' },
    });

    if (existing) {
      console.log('✅ Promo code "KUM" već postoji u bazi.');
      console.log('   Discount:', existing.discountPercentage + '%');
      console.log('   Active:', existing.isActive);
      console.log('   Current uses:', existing.currentUses);
      return;
    }

    // Kreiraj promo code
    const promoCode = await prisma.promoCode.create({
      data: {
        code: 'KUM',
        discountPercentage: 100, // 100% popust
        isActive: true,
        maxUses: null, // Unlimited uses
        currentUses: 0,
        validFrom: null, // Odmah validan
        validUntil: null, // Bez isteka
      },
    });

    console.log('✅ Promo code "KUM" je uspešno kreiran!');
    console.log('   Discount:', promoCode.discountPercentage + '%');
    console.log('   Active:', promoCode.isActive);
    console.log('   Max uses:', promoCode.maxUses === null ? 'Unlimited' : promoCode.maxUses);
  } catch (error) {
    console.error('❌ Greška pri kreiranju promo code-a:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✅ Script završen uspešno.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script završen sa greškom:', error);
    process.exit(1);
  });
