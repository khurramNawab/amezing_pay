import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Template from './models/Template.js';

dotenv.config();

const seedTemplates = async () => {
    try {
        await connectDB();
        console.log('Connected to DB, running seeder...');
        
        await Template.deleteMany({});
        console.log('Templates wiped successfully.');

        const seedData = [
            { name: 'Minimal Light', styleType: 'Minimal Light', isPremium: false },
            { name: 'Modern Dark', styleType: 'Modern Dark', isPremium: false },
            { name: 'Gradient Pro', styleType: 'Gradient Pro', isPremium: true },
            { name: 'Glass Card', styleType: 'Glass Card', isPremium: true },
            { name: 'Corporate Split', styleType: 'Corporate Split', isPremium: false },
            { name: 'Neon Edge', styleType: 'Neon Edge', isPremium: true },
            { name: 'Elegant Gold', styleType: 'Elegant Gold', isPremium: true },
            { name: 'Startup Stack', styleType: 'Startup Stack', isPremium: false },
            { name: 'Creative Portfolio', styleType: 'Creative Portfolio', isPremium: false },
            { name: 'Classic Horizontal', styleType: 'Classic Horizontal', isPremium: false },
        ];
        
        await Template.insertMany(seedData);
        console.log('Successfully seeded 10 templates.');
        process.exit(0);
    } catch (error) {
        console.error('Error during seeding:', error);
        process.exit(1);
    }
};

seedTemplates();
