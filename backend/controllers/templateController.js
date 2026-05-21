import Template from '../models/Template.js';
import { logger } from '../services/logger.js';

// @desc    Get all active templates
// @route   GET /api/templates
// @access  Public
export const getTemplates = async (req, res) => {
    try {
        let templates = await Template.find({ isActive: true });
        
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

        // If we don't have all 10 templates, only add the missing ones
        if (templates.length < 10) {
            for (const item of seedData) {
                const exists = await Template.findOne({ name: item.name });
                if (!exists) {
                    await Template.create(item);
                }
            }
            templates = await Template.find({ isActive: true });
        }

        res.json(templates);
    } catch (error) {
        logger.error('Error in getTemplates', { message: error?.message, stack: error?.stack });
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Seed templates (Admin only typically, but we will leave it open for setup)
// @route   POST /api/templates/seed
// @access  Public (for now, during development)
export const seedTemplates = async (req, res) => {
    try {
        await Template.deleteMany(); // Clear existing
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
        
        const createdTemplates = await Template.insertMany(seedData);
        res.status(201).json(createdTemplates);
    } catch (error) {
        logger.error('Error in seedTemplates', { message: error?.message, stack: error?.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};
