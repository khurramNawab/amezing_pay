import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Withdrawal from '../models/Withdrawal.js';
import Sale from '../models/Sale.js';
import Transaction from '../models/Transaction.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/amezing_pay';

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // 1. Create Dummy Users
    console.log('Seeding Users...');
    const userA = await User.findOneAndUpdate(
      { phone: '9999999991' },
      {
        name: 'Agent Rohit',
        email: 'rohit@example.com',
        role: 'user',
        walletBalance: 5000,
        totalEarnings: 7500,
        kycStatus: 'verified',
        referralCode: 'ROHIT100'
      },
      { upsert: true, returnDocument: 'after' }
    );

    const userB = await User.findOneAndUpdate(
      { phone: '9999999992' },
      {
        name: 'Agent Sumit',
        email: 'sumit@example.com',
        role: 'user',
        walletBalance: 1200,
        totalEarnings: 3000,
        referredBy: userA._id,
        kycStatus: 'pending',
        referralCode: 'SUMIT200'
      },
      { upsert: true, returnDocument: 'after' }
    );

    // 2. Create Dummy Products
    console.log('Seeding Products...');
    await Product.deleteMany({ title: /Testing/ });
    
    const products = [
      {
        title: '[Testing] Digital Marketing Course',
        description: 'Complete guide to grow your business online.',
        price: 499,
        originalPrice: 1999,
        category: 'courses',
        source: 'internal',
        isActive: true,
        placements: ['digital_store'],
        commission: '₹100 Per Sale',
        sellerId: userA._id
      },
      {
        title: '[Testing] Myntra Fashion Deal',
        description: 'Get extra 10% off on all footwear.',
        price: 0,
        originalPrice: 0,
        category: 'fashion',
        source: 'affiliate',
        isActive: true,
        placements: ['trending_affiliate', 'high_commission'],
        shareUrl: 'https://myntra.com',
        platformName: 'Myntra',
        commission: '8% Commission',
        sellerId: userA._id
      }
    ];
    await Product.insertMany(products);

    // 3. Create Dummy Sales
    console.log('Seeding Sales...');
    const s1 = await Sale.create({
      sellerId: userA._id,
      amount: 499,
      status: 'completed',
      title: 'Course Sale',
      provider: 'manual'
    });

    const s2 = await Sale.create({
      sellerId: userB._id,
      amount: 99,
      status: 'completed',
      title: 'Template Sale',
      provider: 'manual'
    });

    // 4. Create Historical Data for Analytics (Past 30 Days)
    console.log('Seeding Historical Data (30 Days)...');
    await User.deleteMany({ phone: /^888888/ }); // Clean old historical users
    const now = new Date();
    const historicalUsers = [];
    const historicalTx = [];

    for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        // Create 1-2 users per day
        historicalUsers.push({
            phone: `888888${1000 + i}`,
            name: `User ${i}`,
            referralCode: `REF${1000 + i}`,
            createdAt: date
        });

        // Create 2-3 transactions per day
        historicalTx.push({
            user: userA._id,
            amount: Math.floor(Math.random() * 500) + 100,
            type: 'income',
            category: 'commission',
            direction: 'credit',
            status: 'success',
            title: `Historical Sale Day ${i}`,
            source: 'commission',
            commissionLevel: i % 2 === 0 ? 'seller' : 'upline',
            createdAt: date
        });
    }
    await User.insertMany(historicalUsers);
    await Transaction.insertMany(historicalTx);

    // 5. Create Dummy Transactions for Withdrawals
    console.log('Seeding Transactions & Withdrawals...');
    
    const createWithdrawal = async (user, amount, status, method, details) => {
      // Create Debit Transaction
      const tx = await Transaction.create({
        user: user._id,
        amount: amount,
        type: 'withdrawal',
        category: 'payout',
        direction: 'debit',
        status: status.toLowerCase() === 'pending' ? 'pending' : 'success',
        title: 'Withdrawal Initiation',
        source: 'withdrawal'
      });

      // Create Withdrawal Record
      return await Withdrawal.create({
        user: user._id,
        amount: amount,
        feeAmount: amount * 0.02,
        payoutAmount: amount * 0.98,
        status: status.toUpperCase(),
        method: method,
        provider: 'manual',
        destination: details,
        initiationTransactionId: tx._id,
        adminNote: 'Dummy testing record'
      });
    };

    await createWithdrawal(userA, 2000, 'PENDING', 'upi', { upiId: 'rohit@okaxis' });
    await createWithdrawal(userB, 1000, 'SUCCESS', 'bank', { 
      accountNumberMasked: 'XXXXXX7890', 
      accountHolder: 'Sumit Kumar', 
      ifsc: 'HDFC0001234' 
    });
    await createWithdrawal(userA, 500, 'FAILED', 'upi', { upiId: 'rohit@okaxis' });

    console.log('✅ Dummy data seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
