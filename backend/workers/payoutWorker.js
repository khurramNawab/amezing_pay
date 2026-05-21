import PayoutJob from '../models/PayoutJob.js';
import { markWithdrawalSuccess, markWithdrawalFailed } from '../services/withdrawalService.js';
import { logger } from '../services/logger.js';
import mongoose from 'mongoose';

let isRunning = false;
let workerTimeout = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const processSingleJob = async (job) => {
  const session = await mongoose.startSession();
  try {
    logger.info(`[PayoutWorker] Processing job ${job._id} for withdrawal ${job.withdrawal}`);
    
    // Simulate payment gateway API call / latency (2 seconds)
    await sleep(2000);

    // Mock API result: 90% success rate
    const isSuccess = Math.random() > 0.1;

    await session.withTransaction(async () => {
      if (isSuccess) {
        const utr = `utr_${Math.random().toString(36).substr(2, 9)}`;
        await markWithdrawalSuccess({
          withdrawalId: job.withdrawal,
          providerPayoutId: `pout_queue_${Date.now()}`,
          note: `UTR: ${utr}`,
        }, { session });

        await PayoutJob.updateOne(
          { _id: job._id },
          { $set: { status: 'success', lockedAt: null } },
          { session }
        );
        logger.info(`[PayoutWorker] Job ${job._id} succeeded (withdrawal ${job.withdrawal})`);
      } else {
        throw new Error('Simulated network/bank gateway rejection');
      }
    });

  } catch (err) {
    logger.warn(`[PayoutWorker] Job ${job._id} failed: ${err.message}`);

    // Handle failure and retries outside transaction
    try {
      const updatedJob = await PayoutJob.findById(job._id);
      if (updatedJob) {
        if (updatedJob.attempts >= updatedJob.maxAttempts) {
          // Max attempts reached, fail the withdrawal and refund the wallet
          await markWithdrawalFailed({
            withdrawalId: job.withdrawal,
            reason: err.message || 'Payout failed after max attempts',
          });

          await PayoutJob.updateOne(
            { _id: job._id },
            { $set: { status: 'failed', lastError: err.message, lockedAt: null } }
          );
          logger.error(`[PayoutWorker] Job ${job._id} failed permanently. Refunded.`);
        } else {
          // Retry later (exponential backoff / 1 minute delay)
          const retryDelay = 60 * 1000; 
          await PayoutJob.updateOne(
            { _id: job._id },
            {
              $set: {
                status: 'pending',
                lastError: err.message,
                runAt: new Date(Date.now() + retryDelay),
                lockedAt: null,
              },
            }
          );
          logger.info(`[PayoutWorker] Job ${job._id} rescheduled in ${retryDelay / 1000}s`);
        }
      }
    } catch (retryErr) {
      logger.error(`[PayoutWorker] Error while handling job failure fallback: ${retryErr.message}`);
    }
  } finally {
    session.endSession();
  }
};

const workerLoop = async () => {
  if (!isRunning) return;

  try {
    // 1. Lock a pending job atomically
    const job = await PayoutJob.findOneAndUpdate(
      {
        status: 'pending',
        runAt: { $lte: new Date() },
      },
      {
        $set: { status: 'processing', lockedAt: new Date() },
        $inc: { attempts: 1 },
      },
      { new: true, sort: { runAt: 1 } }
    );

    if (job) {
      await processSingleJob(job);
    }
  } catch (err) {
    logger.error(`[PayoutWorker] Error in worker loop: ${err.message}`, { stack: err.stack });
  }

  if (isRunning) {
    workerTimeout = setTimeout(workerLoop, 5000); // Poll every 5 seconds
  }
};

export const startPayoutWorker = () => {
  if (isRunning) return;
  isRunning = true;
  logger.info('[PayoutWorker] Payout background worker started.');
  workerLoop();
};

export const stopPayoutWorker = () => {
  isRunning = false;
  if (workerTimeout) {
    clearTimeout(workerTimeout);
    workerTimeout = null;
  }
  logger.info('[PayoutWorker] Payout background worker stopped.');
};
