// utils/queueService.js
// A lightweight queue service that simulates the behavior of a real queue
// Consider implementing Bull or similar in production

const { sendWeeklyDigest } = require('./emailService');

// Simple in-memory queue
const queues = {
  insights: [],
  emails: []
};

// Process queues
setInterval(async () => {
  await processQueue('insights');
  await processQueue('emails');
}, 5000);

async function processQueue(queueName) {
  if (queues[queueName].length > 0) {
    const job = queues[queueName].shift();
    console.log(`Processing ${queueName} job:`, job.id);
    
    // Execute handler based on job type
    try {
      switch (job.type) {
        case 'processReceiptInsights':
          // We'll implement this handler when we need it
          console.log(`Would process insights for receipt: ${job.data.receiptId}`);
          break;
        case 'sendBudgetAlert':
          // We'll implement this handler when we need it
          console.log(`Would send budget alert for: ${job.data.category}`);
          break;
        case 'sendWeeklyDigest':
          await sendWeeklyDigest(job.data.userId, job.data.digestId);
          break;
        default:
          console.error(`Unknown job type: ${job.type}`);
      }
    } catch (error) {
      console.error(`Error processing ${job.type} job:`, error);
      
      // Retry if attempts left
      if (job.attempts < job.maxAttempts) {
        job.attempts++;
        // Add back to queue with delay
        setTimeout(() => {
          queues[queueName].push(job);
        }, job.backoff * job.attempts);
      } else {
        console.error(`Job ${job.id} failed after ${job.attempts} attempts`);
      }
    }
  }
}

/**
 * Add a job to the appropriate queue
 */
async function addJob(jobType, jobData, options = {}) {
  try {
    const job = {
      id: Math.random().toString(36).substr(2, 9),
      type: jobType,
      data: jobData,
      attempts: 0,
      maxAttempts: options.attempts || 3,
      backoff: options.backoff?.delay || 10000,
      added: new Date()
    };
    
    switch (jobType) {
      case 'processReceiptInsights':
        queues.insights.push(job);
        break;
      case 'sendBudgetAlert':
      case 'sendWeeklyDigest':
        queues.emails.push(job);
        break;
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
    
    console.log(`Added ${jobType} job to queue:`, job.id);
    return job;
  } catch (error) {
    console.error(`Error adding job ${jobType} to queue:`, error);
    throw error;
  }
}

module.exports = {
  addJob,
  queues
};