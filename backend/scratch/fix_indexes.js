import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const dropPhoneIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');
        
        const collection = mongoose.connection.collection('users');
        
        // List indexes
        const indexes = await collection.listIndexes().toArray();
        console.log('Current Indexes:', indexes.map(i => i.name));
        
        if (indexes.find(i => i.name === 'phone_1')) {
            console.log('Dropping phone_1 index...');
            await collection.dropIndex('phone_1');
            console.log('Index dropped successfully');
        } else {
            console.log('phone_1 index not found');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error dropping index:', error);
        process.exit(1);
    }
};

dropPhoneIndex();
