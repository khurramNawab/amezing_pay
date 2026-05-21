import QuizQuestion from '../../models/QuizQuestion.js';

export const listQuestions = async (req, res) => {
  const difficulty = String(req.query.difficulty || '').trim();
  const q = String(req.query.q || '').trim();
  const filter = {};
  if (difficulty) filter.difficulty = difficulty;
  if (q) filter.prompt = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const items = await QuizQuestion.find(filter).sort({ createdAt: -1 }).limit(200);
  return res.json({ items });
};

export const createQuestion = async (req, res) => {
  const { prompt, options, correctIndex, difficulty, category, isActive } = req.body || {};
  if (!prompt || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ message: 'prompt and options (min 2) are required' });
  }
  const ci = Number(correctIndex);
  if (!Number.isFinite(ci) || ci < 0 || ci >= options.length) {
    return res.status(400).json({ message: 'correctIndex is invalid' });
  }
  const doc = await QuizQuestion.create({
    prompt: String(prompt).trim(),
    options: options.map((o) => String(o)),
    correctIndex: ci,
    difficulty: difficulty || 'easy',
    category: category || 'general',
    isActive: isActive !== false,
  });
  return res.status(201).json(doc);
};

export const updateQuestion = async (req, res) => {
  const doc = await QuizQuestion.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Question not found' });
  const { prompt, options, correctIndex, difficulty, category, isActive } = req.body || {};

  if (typeof prompt === 'string') doc.prompt = prompt.trim();
  if (Array.isArray(options) && options.length >= 2) doc.options = options.map((o) => String(o));
  if (typeof correctIndex === 'number') doc.correctIndex = correctIndex;
  if (typeof difficulty === 'string') doc.difficulty = difficulty;
  if (typeof category === 'string') doc.category = category;
  if (typeof isActive === 'boolean') doc.isActive = isActive;

  if (doc.correctIndex < 0 || doc.correctIndex >= doc.options.length) {
    return res.status(400).json({ message: 'correctIndex out of bounds' });
  }

  await doc.save();
  return res.json(doc);
};

export const deleteQuestion = async (req, res) => {
  const doc = await QuizQuestion.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Question not found' });
  await doc.deleteOne();
  return res.json({ message: 'Deleted' });
};

