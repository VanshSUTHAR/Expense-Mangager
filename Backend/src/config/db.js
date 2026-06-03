const mongoose = require('mongoose');
const dns = require('dns');

// System DNS is broken; force Google's public DNS so Atlas SRV records resolve
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }

  // Remove legacy index if it exists — non-fatal if collection doesn't exist yet
  try {
    const collection = mongoose.connection.db.collection('creditcardbills');
    const indexes = await collection.indexes();
    const hasLegacyTransactionIndex = indexes.some((index) => index.name === 'transaction_1');
    if (hasLegacyTransactionIndex) {
      await collection.dropIndex('transaction_1');
      console.log('✅ Removed legacy credit card bill index: transaction_1');
    }
  } catch {
    // Collection does not exist yet — safe to ignore
  }
};

module.exports = connectDB;
