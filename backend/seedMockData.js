import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import User from './models/User.js';
import connectDB from './config/db.js';

dotenv.config();
connectDB();

const seedMockData = async () => {
  try {
    // 1. Update all users' wallets to add 12,000 INR
    await User.updateMany({}, {
      $inc: {
        walletBalance: 12000,
        totalEarnings: 12000
      }
    });

    console.log('Added ₹12,000 to all users.');

    // 2. Fetch an admin or a user to be the seller
    let seller = await User.findOne({ role: 'admin' });
    if (!seller) {
      seller = await User.findOne({}); // fallback to any user
    }

    if (!seller) {
       console.log('No users found to set as seller. Please register a user first.');
       process.exit(1);
    }

    // 3. Delete old mock products to avoid duplicates
    await Product.deleteMany({});

    // 4. Insert Affiliates, High Commission Services
    const mockProducts = [
      // Affiliate Products
      {
        title: 'boAt Airdopes 141 TWS Earbuds',
        description: 'Best selling TWS with 42H playtime and ENx tech. High conversion!',
        price: 1299,
        commission: '₹85',
        originalPrice: 2990,
        category: 'Electronics',
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&q=80',
        sellerId: seller._id,
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
        sellerId: seller._id,
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
        sellerId: seller._id,
        source: 'affiliate',
        platformName: 'Amazon',
        platformColor: '#FF9900',
        trustBadge: 'Premium',
      },
      // Internal Products (High Commission Services)
      {
        title: 'Digital Visiting Card (Gold Edition)',
        description: 'Exclusive gold-theme NFC business card with lifetime dashboard.',
        price: 999,
        commission: '₹300',
        originalPrice: 1999,
        category: 'Services',
        imageUrl: 'https://images.unsplash.com/photo-1589149098258-3e9102ca63d3?w=400&q=80',
        sellerId: seller._id,
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
        sellerId: seller._id,
        source: 'internal',
        platformName: 'Amezing Pay',
        platformColor: '#6366F1',
        trustBadge: 'Certified',
        assetUrl: 'https://example.com/download/course-pi'
      }
    ];

    await Product.insertMany(mockProducts);
    console.log('Mock Affiliates and Services injected.');

    console.log('Process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error in seedMockData:', error);
    process.exit(1);
  }
};

seedMockData();
