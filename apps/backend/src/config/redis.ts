import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Main Redis client for pub/sub adapter
export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
});

// Subscriber client for Socket.io adapter (needs separate connection)
export const redisSubscriber = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
});

// Event handlers
redisClient.on('connect', () => {
  console.log('✅ Redis connected (publisher)');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

redisSubscriber.on('connect', () => {
  console.log('✅ Redis connected (subscriber)');
});

redisSubscriber.on('error', (err) => {
  console.error('❌ Redis subscriber error:', err.message);
});

// Connect both clients
export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
    await redisSubscriber.connect();
    console.log('✅ Redis connections established');
  } catch (error) {
    // Redis might auto-connect, so ignore "already connected" errors
    if (error instanceof Error && !error.message.includes('already')) {
      console.warn('⚠️ Redis connection warning:', error.message);
    }
  }
}

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  await redisClient.quit();
  await redisSubscriber.quit();
  console.log('👋 Redis disconnected');
}

export default redisClient;
