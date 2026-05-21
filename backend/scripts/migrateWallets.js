import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Wallet from '../models/Wallet.js';
import Transaction from '../models/Transaction.js';
import { SUCCESS_STATUSES, ACTIVE_PENDING_STATUSES } from '../services/transactionService.js';

dotenv.config();

const money = (n) => {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/amezing_pay');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const migrateWallets = async () => {
  await connectDB();
  console.log('Starting migration...');

  const wallets = await Wallet.find();
  console.log(`Found ${wallets.length} wallets to migrate.`);

  let migratedCount = 0;

  for (const wallet of wallets) {
    const statuses = wallet.layer === 'pending' ? ACTIVE_PENDING_STATUSES : SUCCESS_STATUSES;
    
    const agg = await Transaction.aggregate([
      { $match: { user: wallet.user, wallet: wallet.layer, status: { $in: statuses } } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [{ $eq: ['$direction', 'debit'] }, { $multiply: ['$amount', -1] }, '$amount'],
            },
          },
        },
      },
    ]);
    
    const balance = money(agg?.[0]?.total ?? 0);
    wallet.balance = Math.max(0, balance);
    await wallet.save();
    
    migratedCount++;
    if (migratedCount % 100 === 0) {
      console.log(`Migrated ${migratedCount}/${wallets.length} wallets...`);
    }
  }

  console.log(`Migration complete! Successfully updated ${migratedCount} wallets.`);
  process.exit(0);
};

migrateWallets();
