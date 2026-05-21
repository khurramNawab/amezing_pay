import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const CardSchema = new mongoose.Schema({}, { strict: false });
const Card = mongoose.model('Card', CardSchema);

async function checkCard() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const cardId = '69f34caf5926e64265b83b97';
        const card = await Card.findById(cardId);

        if (!card) {
            console.log('❌ ERROR: Card NOT found in database.');
        } else {
            console.log('✅ SUCCESS: Card found.');
            console.log('Data:', JSON.stringify(card, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error('Database Error:', err.message);
        process.exit(1);
    }
}

checkCard();
