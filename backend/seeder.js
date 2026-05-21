import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import User from './models/User.js';
import Transaction from './models/Transaction.js';
import connectDB from './config/db.js';

dotenv.config();
connectDB();

const seedData = async () => {
  try {
    // 1. Clear existing data
    await Product.deleteMany();
    await Transaction.deleteMany();

    // 2. Find or create admin/seller
    let admin = await User.findOne({ phone: '9999999999' });
    if (!admin) {
      admin = await User.create({
        phone: '9999999999',
        name: 'Amezing Admin',
        email: 'admin@amezingpay.com',
        referralCode: 'ADMIN2026',
        walletBalance: 4820,
        totalEarnings: 12450,
        role: 'admin'
      });
    } else {
        // Update stats for existing admin
        admin.walletBalance = 4820;
        admin.totalEarnings = 12450;
        await admin.save();
    }

    const dummyProducts = [
      // Affiliate Products
      {
        title: 'boAt Airdopes 141 TWS Earbuds',
        description: 'Best selling TWS with 42H playtime and ENx tech.',
        price: 1299,
        commission: '₹85',
        originalPrice: 2990,
        category: 'Electronics',
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&q=80',
        sellerId: admin._id,
        source: 'affiliate',
        platformName: 'Amazon',
        platformColor: '#FF9900',
        trustBadge: 'High Conversion',
      },
      {
        title: 'Noise ColorFit Pro 4 Smartwatch',
        description: '1.72" display with BT calling and health monitoring.',
        price: 3499,
        commission: '₹120',
        originalPrice: 5999,
        category: 'Wearables',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80',
        sellerId: admin._id,
        source: 'affiliate',
        platformName: 'Flipkart',
        platformColor: '#2874F0',
        trustBadge: 'Verified',
      },
      {
        title: 'Apple iPad Air (5th Gen)',
        description: 'M1 chip, 10.9-inch Liquid Retina display, 64GB.',
        price: 54999,
        commission: '₹450',
        originalPrice: 59900,
        category: 'Electronics',
        imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80',
        sellerId: admin._id,
        source: 'affiliate',
        platformName: 'Amazon',
        platformColor: '#FF9900',
        trustBadge: 'Premium',
      },
      // Internal Products
      {
        title: 'Digital Visiting Card (Gold Edition)',
        description: 'Exclusive gold-theme NFC business card with lifetime dashboard.',
        price: 999,
        commission: '₹300',
        originalPrice: 1999,
        category: 'Services',
        imageUrl: 'https://images.unsplash.com/photo-1589149098258-3e9102ca63d3?w=400&q=80',
        sellerId: admin._id,
        source: 'internal',
        platformName: 'Amezing Pay',
        platformColor: '#6366F1',
        trustBadge: 'Internal Service',
        assetUrl: 'https://example.com/download/card-gold'
      },
      {
        title: 'Passive Income Course 2026',
        description: 'Complete guide to building affiliate networks from scratch.',
        price: 4999,
        commission: '₹800',
        originalPrice: 9999,
        category: 'Education',
        imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80',
        sellerId: admin._id,
        source: 'internal',
        platformName: 'Amezing Pay',
        platformColor: '#6366F1',
        trustBadge: 'Certified',
        assetUrl: 'https://example.com/download/course-pi'
      }
    ];

    await Product.insertMany(dummyProducts);

    // 3. Seed expanded transactions
    const dummyTransactions = [
      { user: admin._id, amount: 2500, title: 'Bank Withdrawal', type: 'withdrawal', category: 'bonus', status: 'completed' },
      { user: admin._id, amount: 85, title: 'Earbuds Commission', type: 'income', category: 'commission', status: 'completed' },
      { user: admin._id, amount: 120, title: 'Watch Commission', type: 'income', category: 'commission', status: 'completed' },
      { user: admin._id, amount: 2400, title: 'Network Bonus', type: 'income', category: 'referral', status: 'completed' },
      { user: admin._id, amount: 300, title: 'Digital Card Sale', type: 'income', category: 'internal', status: 'completed' },
      { user: admin._id, amount: 800, title: 'Course Sale Bonus', type: 'income', category: 'internal', status: 'completed' },
      { user: admin._id, amount: 5000, title: 'Pending Payout', type: 'withdrawal', category: 'bonus', status: 'pending' },
    ];

    await Transaction.insertMany(dummyTransactions);

    console.log('Premium Data Seeded Successfully! System is fully checkable.');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
