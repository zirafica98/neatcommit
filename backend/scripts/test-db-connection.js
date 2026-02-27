/**
 * Test database connection script
 * 
 * Usage: node scripts/test-db-connection.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function testConnection() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Add it to backend/.env before running this script.');
    }

    console.log('🔄 Testing database connection...');
    console.log('📍 Connection string: Using DATABASE_URL from env');
    
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
      console.error('💡 Tip: Verify host/port and DNS in your Supabase connection string');
    }
    if (error.code === 'P1001') {
      console.error('💡 Tip: For Supabase use connection string with sslmode=require');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
