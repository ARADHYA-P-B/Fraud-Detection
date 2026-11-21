import os
import json
import logging
import time
import redis
from typing import Any
from redis.exceptions import ResponseError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stream-worker")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
STREAM_NAME = "fraud-events-stream"
GROUP_NAME = "fraud-processing-group"
CONSUMER_NAME = "worker-node-1"

# Initialize Redis Connection
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

def setup_consumer_group():
    """Creates the Redis consumer group if it doesn't already exist."""
    try:
        # MKSTREAM=True creates the stream automatically if it doesn't exist yet
        redis_client.xgroup_create(STREAM_NAME, GROUP_NAME, id="0", mkstream=True)
        logger.info(f"Consumer group '{GROUP_NAME}' created successfully.")
    except ResponseError as e:
        if "BUSYGROUP" in str(e):
            logger.info(f"Consumer group '{GROUP_NAME}' already exists.")
        else:
            raise e

def update_redis_features(event):
    """Updates sliding-window velocity features in Redis using Sorted Sets (ZSET)."""
    user_id = event.get("user_id")
    event_type = event.get("event_type")
    event_score = time.time()
    event_id = event.get("event_id")
    
    pipeline = redis_client.pipeline()
    
    # 1. Add event to user's global event stream ZSET
    zset_key = f"user:{user_id}:recent_events"
    pipeline.zadd(zset_key, {json.dumps({"event_id": event_id, "type": event_type}): event_score})
    
    # 2. Set expiry and clean up events older than 15 minutes (900 seconds)
    pipeline.expire(zset_key, 3600)
    pipeline.zremrangebyscore(zset_key, 0, event_score - 900)
    
    # 3. Increment action counter
    counter_key = f"user:{user_id}:counter:{event_type}"
    pipeline.incr(counter_key)
    pipeline.expire(counter_key, 900)
    
    pipeline.execute()
    recent_count = redis_client.zcard(zset_key)
    logger.info(f"Processed '{event_type}' for user '{user_id}'. 15m window count: {recent_count}")

def run_stream_consumer():
    setup_consumer_group()
    logger.info("Redis Stream worker listening for events...")
    
    while True:
        try:
            # Read new messages assigned to this consumer group
            # '>' means get messages never delivered to any other consumer in this group
            streams:Any = redis_client.xreadgroup(
                groupname=GROUP_NAME,
                consumername=CONSUMER_NAME,
                streams={STREAM_NAME: ">"},
                count=10,
                block=5000  # Block for up to 5 seconds if idle
            )
            
            if streams:
                for stream, messages in streams:
                    for message_id, data in messages:
                        try:
                            event_data = json.loads(data["payload"])
                            update_redis_features(event_data)
                            
                            # Acknowledge message processing completion
                            redis_client.xack(STREAM_NAME, GROUP_NAME, message_id)
                        except Exception as inner_e:
                            logger.error(f"Error handling message {message_id}: {inner_e}")
                            
        except Exception as e:
            logger.error(f"Redis stream read error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    # Wait for Redis container to boot up
    time.sleep(3)
    run_stream_consumer()