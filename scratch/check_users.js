import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './backend/models/User.js';

dotenv.config({ path: './backend/.env' });

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({}, 'email name phone emailVerified isBlocked');
        console.log('Users in database:');
        console.table(users.map(u => ({
            id: u._id,
            email: u.email,
            name: u.name,
            phone: u.phone,
            verified: u.emailVerified,
            blocked: u.isBlocked
        })));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUsers();
