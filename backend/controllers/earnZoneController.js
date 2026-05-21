import AppConfig from '../models/AppConfig.js';
import QuizQuestion from '../models/QuizQuestion.js';
import QuizSession from '../models/QuizSession.js';
import { createTaskReward, getDailyRewardEarned, getDailyTaskStatus } from '../services/rewardEngine.js';
import { buildWalletSummary } from '../services/walletService.js';
import { applyProCardAccessToUser, canClaimMysteryAccessToday, getProCardAccessState } from '../services/proCardAccessService.js';
import crypto from 'crypto';

export const getEarnZoneConfig = async (req, res) => {
  const config = await AppConfig.getSingleton();
  const ez = config.earnzone || {};
  const earnedToday = await getDailyRewardEarned(req.user._id);
  const completedTasks = await getDailyTaskStatus(req.user._id);

  return res.json({
    enabled: ez.enabled !== false,
    dailyLimitInr: Number(ez.dailyLimitInr ?? 0),
    earnedTodayInr: earnedToday,
    completedTasks,
    tasks: ez.tasks || [],
    autoValidateRewards: true,
    proCardAccess: getProCardAccessState(req.user),
    quiz: {
      enabled: ez.quiz?.enabled !== false,
      questionsCount: Number(ez.quiz?.questionsCount || 3),
      difficulty: ez.quiz?.difficulty || 'easy',
      rewardInr: Number(ez.quiz?.rewardInr ?? 0),
      timePerQuestionSec: Number(ez.quiz?.timePerQuestionSec || 12),
      minCorrect: Number(ez.quiz?.minCorrect ?? 0),
    },
    spin: { enabled: ez.spin?.enabled !== false, rewardInr: Number(ez.spin?.rewardInr ?? 0) },
    ads: { enabled: ez.ads?.enabled !== false, rewardInr: Number(ez.ads?.rewardInr ?? 0) },
    engagement: {
      enabled: ez.engagement?.enabled !== false,
      rewardInr: Number(ez.engagement?.rewardInr ?? 0),
    },
  });
};

export const grantProCardAccess = async (req, res) => {
  const config = await AppConfig.getSingleton();
  const ez = config.earnzone || {};

  if (ez.enabled === false) {
    return res.status(400).json({ message: 'Earn Zone is disabled' });
  }

  const completedTasks = await getDailyTaskStatus(req.user._id);
  const taskCount = Array.isArray(ez.tasks) ? ez.tasks.filter((task) => task?.enabled !== false).length : 0;
  const completedCount = Object.values(completedTasks || {}).filter(Boolean).length;
  const allDone = taskCount > 0 && completedCount >= taskCount;

  if (!allDone) {
    return res.status(400).json({ message: 'Complete all tasks before opening the mystery box' });
  }

  if (!canClaimMysteryAccessToday(req.user)) {
    return res.status(409).json({
      message: 'Mystery box already opened today',
      proCardAccess: getProCardAccessState(req.user),
    });
  }

  const proCardAccess = await applyProCardAccessToUser(req.user, {
    days: 7,
    source: 'earn_zone_mystery_box',
  });

  const wallet = await buildWalletSummary(req.user._id);
  return res.json({
    message: 'PRO access granted',
    proCardAccess,
    wallet,
  });
};

export const startQuiz = async (req, res) => {
  const config = await AppConfig.getSingleton();
  const ez = config.earnzone || {};
  if (ez.enabled === false || ez.quiz?.enabled === false) {
    return res.status(400).json({ message: 'Quiz is disabled' });
  }

  const earnedToday = await getDailyRewardEarned(req.user._id);
  const dailyLimit = Number(ez.dailyLimitInr ?? 0);
  if (dailyLimit > 0 && earnedToday >= dailyLimit) {
    return res.status(429).json({ message: 'Daily limit reached' });
  }

  const count = Math.min(10, Math.max(1, Number(ez.quiz?.questionsCount || 3)));
  const difficulty = String(ez.quiz?.difficulty || 'easy');
  const timePerQuestionSec = Math.min(30, Math.max(8, Number(ez.quiz?.timePerQuestionSec || 12)));

  const questions = await QuizQuestion.aggregate([
    { $match: { isActive: true, difficulty } },
    { $sample: { size: count } },
    { $project: { prompt: 1, options: 1, difficulty: 1, category: 1 } },
  ]);

  if (!questions.length) {
    return res.status(400).json({ message: 'No quiz questions available' });
  }

  const session = await QuizSession.create({
    user: req.user._id,
    questionIds: questions.map((q) => q._id),
    timePerQuestionSec,
    status: 'active',
  });

  return res.json({
    sessionId: session._id,
    timePerQuestionSec,
    questions: questions.map((q) => ({
      id: q._id,
      prompt: q.prompt,
      options: q.options,
    })),
  });
};

export const submitQuiz = async (req, res) => {
  const { sessionId, answers } = req.body || {};
  if (!sessionId || !Array.isArray(answers)) {
    return res.status(400).json({ message: 'sessionId and answers are required' });
  }

  const config = await AppConfig.getSingleton();
  const ez = config.earnzone || {};
  if (ez.enabled === false || ez.quiz?.enabled === false) {
    return res.status(400).json({ message: 'Quiz is disabled' });
  }

  const session = await QuizSession.findOne({ _id: sessionId, user: req.user._id });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (session.status !== 'active') return res.status(400).json({ message: 'Session already submitted/expired' });

  const questionIds = session.questionIds.map((x) => String(x));
  const answerMap = new Map(answers.map((a) => [String(a.questionId), Number(a.selectedIndex)]));
  const questions = await QuizQuestion.find({ _id: { $in: session.questionIds } }).select('correctIndex');

  let correct = 0;
  for (const q of questions) {
    const selected = answerMap.get(String(q._id));
    if (selected === q.correctIndex) correct += 1;
  }

  const completed = answers.length >= questionIds.length;
  const passed = correct === questionIds.length;

  session.status = 'submitted';
  session.submittedAt = new Date();
  await session.save();

  if (!(completed && passed)) {
    return res.json({
      correct,
      total: questionIds.length,
      rewardCredited: false,
      rewardInr: 0,
      pending: false,
    });
  }

  const rewardResult = await createTaskReward({
    userId: req.user._id,
    taskType: 'quiz',
    idempotencyKey: `quiz:${session._id}`,
    metadata: { sessionId: String(session._id), correct, total: questionIds.length },
  });

  if (!rewardResult.rewardCreated) {
    return res.json({
      correct,
      total: questionIds.length,
      rewardCredited: false,
      rewardInr: 0,
      pending: false,
      reason: rewardResult.reason,
    });
  }

  const wallet = await buildWalletSummary(req.user._id);
  return res.json({
    correct,
    total: questionIds.length,
    rewardCredited: true,
    rewardInr: rewardResult.amount,
    pending: !rewardResult.settled,
    wallet,
  });
};

export const processSpin = async (req, res) => {
  const config = await AppConfig.getSingleton();
  const ez = config.earnzone || {};
  if (ez.enabled === false || ez.spin?.enabled === false) {
    return res.status(400).json({ message: 'Spin & Win is disabled' });
  }

  const rewardResult = await createTaskReward({
    userId: req.user._id,
    taskType: 'spin',
    idempotencyKey: `spin:${req.user._id}:${new Date().toISOString().slice(0, 10)}`,
    metadata: { source: 'spin' },
  });

  if (!rewardResult.rewardCreated) {
    return res.status(429).json({ message: 'Daily limit reached for today', rewardInr: 0 });
  }

  const wallet = await buildWalletSummary(req.user._id);
  return res.json({
    rewardCredited: true,
    rewardInr: rewardResult.amount,
    pending: !rewardResult.settled,
    wallet,
  });
};

export const processAdReward = async (req, res) => {
  const config = await AppConfig.getSingleton();
  const ez = config.earnzone || {};
  if (ez.enabled === false || ez.ads?.enabled === false) {
    return res.status(400).json({ message: 'Ads reward is disabled' });
  }

  const adId = String(req.body?.adId || '').trim();
  if (!adId || adId.length < 8 || !/^[a-zA-Z0-9_\-]+$/.test(adId)) {
    return res.status(400).json({ message: 'A valid adId is required to claim rewards' });
  }

  // S2S/SDK verification placeholder (AdMob/Unity Ads)
  const adVerificationToken = req.body?.adVerificationToken;
  const isS2SVerificationEnabled = false; // Set to true to enforce signature checks
  if (isS2SVerificationEnabled) {
    if (!adVerificationToken) {
      return res.status(400).json({ message: 'Security verification token is missing' });
    }
    // const expectedToken = crypto.createHmac('sha256', process.env.AD_VERIFICATION_SECRET).update(adId).digest('hex');
    // const a = Buffer.from(adVerificationToken, 'utf8');
    // const b = Buffer.from(expectedToken, 'utf8');
    // if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    //   return res.status(403).json({ message: 'Ad verification failed: signature mismatch' });
    // }
  }

  const rewardResult = await createTaskReward({
    userId: req.user._id,
    taskType: 'ad',
    idempotencyKey: `ad:${adId}:${req.user._id}`, // Remove Date.now() fallback entirely
    metadata: { source: 'ad', adId },
  });

  if (!rewardResult.rewardCreated) {
    return res.status(429).json({ message: 'Daily limit reached for today or duplicate reward claim', rewardInr: 0 });
  }

  const wallet = await buildWalletSummary(req.user._id);
  return res.json({
    rewardCredited: true,
    rewardInr: rewardResult.amount,
    pending: !rewardResult.settled,
    wallet,
  });
};
