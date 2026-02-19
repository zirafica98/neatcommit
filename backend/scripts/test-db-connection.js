/**
 * Test database connection script
 * 
 * Usage: node scripts/test-db-connection.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://elementer_user:Akaib7qLv6igREqfq3mkp6cwLlMCsq92@dpg-d6b1s30boq4c73bjt0i0-a:5432/elementer',
    },
  },
});

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');
    console.log('📍 Connection string:', process.env.DATABASE_URL ? 'Using DATABASE_URL from env' : 'Using hardcoded string');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!');
    
    // Test query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('📊 PostgreSQL version:', result[0].version);
    
    // Test if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📋 Tables found:', tables.length);
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Tip: Hostname might need .render.com suffix for external connections');
      console.error('💡 Try using External Connection String from Render dashboard');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
