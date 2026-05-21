import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

async function checkRecentProducts() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/amezing_pay');
  const products = await Product.find().sort({ createdAt: -1 }).limit(5);
  console.log(JSON.stringify(products, null, 2));
  await mongoose.disconnect();
}

checkRecentProducts();
