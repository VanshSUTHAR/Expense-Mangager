const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/expense-manager';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

const connectDB = async () => {
  const tryConnect = async (uri, label) => {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected (${label}): ${conn.connection.host}`);
    return conn;
  };

  try {
    await tryConnect(MONGODB_URI, process.env.MONGODB_URI ? 'remote' : 'local');
  } catch (error) {
    console.error(`❌ MongoDB Error (${MONGODB_URI}): ${error.message}`);

    if (process.env.MONGODB_URI && MONGODB_URI !== DEFAULT_MONGODB_URI) {
      console.warn('⚠️ Falling back to default local MongoDB URI. Make sure a local MongoDB instance is running.');
      try {
        await tryConnect(DEFAULT_MONGODB_URI, 'local fallback');
      } catch (fallbackError) {
        console.error(`❌ Local MongoDB fallback failed: ${fallbackError.message}`);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }

  try {
    const collection = mongoose.connection.db.collection('creditcardbills');
    const indexes = await collection.indexes();
    const hasLegacyTransactionIndex = indexes.some((index) => index.name === 'transaction_1');
    if (hasLegacyTransactionIndex) {
      await collection.dropIndex('transaction_1');
      console.log('✅ Removed legacy credit card bill index: transaction_1');
    }
  } catch {
  }
};

module.exports = connectDB;
