const mongoose = require('mongoose');
const dns = require('dns');

 dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
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
