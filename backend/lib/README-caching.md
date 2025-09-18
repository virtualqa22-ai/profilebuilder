# Caching System Documentation

## Overview

The profilebuilder project implements a comprehensive multi-level caching system to optimize performance for frequently accessed data. The caching layer supports both in-memory and Redis-based storage with configurable TTL management, cache invalidation strategies, and comprehensive monitoring.

## Architecture

### Multi-Level Caching Strategy

The caching system implements a two-tier approach:

1. **Memory Cache (L1)**: Fast in-memory storage using Map with TTL
2. **Redis Cache (L2)**: Distributed persistent storage with automatic failover

### Cache Manager

The `CacheManager` class (`backend/lib/cacheManager.ts`) provides a unified interface for all caching operations:

- **Memory-first lookup**: Checks memory cache first for maximum speed
- **Redis fallback**: Falls back to Redis if memory cache misses
- **Automatic population**: Populates memory cache from Redis hits
- **Graceful degradation**: Continues operating with memory-only if Redis fails

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
CACHE_REDIS_ENABLED=true

# Cache TTL Settings
CACHE_DEFAULT_TTL=300  # 5 minutes default
```

### Cache Manager Options

```typescript
const cacheManager = new CacheManager({
  redisUrl: process.env.REDIS_URL,
  enableRedis: true,
  defaultTTL: 300,  // seconds
  cleanupIntervalMinutes: 10
});
```

## Cache Keys

Standardized cache key patterns for consistent naming:

```typescript
// Static data
'locales:all'

// User-specific data
`user:data:${email}`
`user:settings:${email}`
`user:session:${userId}`

// Dynamic data
'resumes:all'
`resume:${id}`
`resume:template:${templateId}`
```

## API Integration

### Updated Endpoints

The following API endpoints now utilize caching:

#### `/api/locales` (GET)
- **Cache Key**: `locales:all`
- **TTL**: 1 hour (static data)
- **Strategy**: Cache-first with database fallback

#### `/api/resumes` (GET)
- **Cache Key**: `resumes:all`
- **TTL**: 5 minutes (dynamic data)
- **Invalidation**: Triggered on POST operations

#### `/api/user/data` (GET)
- **Cache Key**: `user:data:${email}`
- **TTL**: 10 minutes (user data)
- **Strategy**: User-specific caching

#### `/api/user/settings` (GET)
- **Cache Key**: `user:settings:${email}`
- **TTL**: 15 minutes (settings data)
- **Invalidation**: Triggered on PUT operations

## Cache Operations

### Basic Operations

```typescript
import { getCacheManager } from '@/backend/lib/cacheManager';

const cache = getCacheManager();

// Set cache value
await cache.set('key', data, 300);  // 5 minutes TTL

// Get cache value
const data = await cache.get('key');

// Delete cache entry
await cache.delete('key');

// Clear all cache
await cache.clear();
```

### Advanced Operations

```typescript
// Pattern-based invalidation
await cache.invalidatePattern('user:*');

// Health check
const health = await cache.healthCheck();
console.log('Memory healthy:', health.memory);
console.log('Redis healthy:', health.redis);

// Get statistics
const stats = cache.getStats();
console.log('Memory hits:', stats.memory.hits);
console.log('Redis misses:', stats.redis?.misses);
```

## TTL Management

### Default TTL Values

- **Static data** (locales): 3600 seconds (1 hour)
- **User data**: 600 seconds (10 minutes)
- **Settings**: 900 seconds (15 minutes)
- **Dynamic data** (resumes): 300 seconds (5 minutes)

### Custom TTL

```typescript
// Override default TTL
await cache.set('custom:key', data, 1800);  // 30 minutes
```

## Cache Invalidation

### Automatic Invalidation

The system automatically invalidates cache entries when data is modified:

- **Resume creation**: Invalidates `resumes:all`
- **Settings update**: Invalidates `user:settings:${email}`
- **User data changes**: Invalidates `user:data:${email}`

### Manual Invalidation

```typescript
// Invalidate specific key
await cache.delete('specific:key');

// Invalidate by pattern
await cache.invalidatePattern('user:session:*');
```

## Monitoring and Metrics

### Cache Statistics

The cache manager tracks comprehensive metrics:

```typescript
const stats = cache.getStats();
{
  memory: {
    hits: 150,
    misses: 25,
    sets: 175,
    deletes: 10,
    errors: 0
  },
  redis: {
    hits: 120,
    misses: 30,
    sets: 150,
    deletes: 8,
    errors: 2
  }
}
```

### Health Monitoring

```typescript
const health = await cache.healthCheck();
{
  memory: true,  // Always true for memory cache
  redis: true    // Redis connection status
}
```

## Error Handling

### Graceful Degradation

- **Redis failure**: Falls back to memory-only operation
- **Memory failure**: Logs error but continues operation
- **Serialization errors**: Logs and returns null

### Error Recovery

```typescript
try {
  const data = await cache.get('key');
  if (data === null) {
    // Cache miss or error - fetch from database
    const freshData = await fetchFromDatabase();
    await cache.set('key', freshData);
    return freshData;
  }
  return data;
} catch (error) {
  console.error('Cache operation failed:', error);
  // Fallback to direct database access
  return await fetchFromDatabase();
}
```

## Performance Optimization

### Best Practices

1. **Cache static data**: Use longer TTL for rarely changing data
2. **User-specific keys**: Include user identifiers for personalized data
3. **Strategic invalidation**: Invalidate only affected cache entries
4. **Monitor hit rates**: Track cache effectiveness and adjust TTL as needed

### Performance Metrics

- **Memory cache**: Sub-millisecond response times
- **Redis cache**: 1-5ms response times
- **Cache hit ratio**: Target >80% for optimal performance

## Docker Integration

### Redis Service

The `docker-compose.yml` includes a Redis service:

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes
  volumes:
    - redis_data:/data
  restart: unless-stopped
```

### Environment Configuration

```yaml
app:
  environment:
    - REDIS_URL=redis://redis:6379
    - CACHE_REDIS_ENABLED=true
    - CACHE_DEFAULT_TTL=300
  depends_on:
    - redis
```

## Security Considerations

### Data Privacy

- **Sensitive data**: Avoid caching sensitive information
- **Encryption**: Redis data is not encrypted by default
- **Access control**: Redis should be secured in production

### Cache Poisoning

- **Validation**: Always validate cached data integrity
- **TTL limits**: Prevent stale data from being served indefinitely
- **Invalidation**: Implement comprehensive invalidation strategies

## Troubleshooting

### Common Issues

1. **Redis connection failures**
   - Check Redis service status
   - Verify connection string
   - Review firewall settings

2. **High memory usage**
   - Monitor cache size
   - Adjust TTL values
   - Implement cache size limits

3. **Cache misses**
   - Review TTL settings
   - Check invalidation logic
   - Monitor cache hit rates

### Debugging

```typescript
// Enable detailed logging
const cache = getCacheManager();
console.log('Cache stats:', cache.getStats());
console.log('Cache health:', await cache.healthCheck());
```

## Future Enhancements

### Planned Features

- **Cache clustering**: Redis cluster support for horizontal scaling
- **Cache warming**: Pre-populate cache on startup
- **Advanced invalidation**: Tag-based cache invalidation
- **Metrics export**: Prometheus metrics integration
- **Cache compression**: Reduce memory footprint

### Monitoring Integration

- **Prometheus metrics**: Export cache metrics to monitoring systems
- **Grafana dashboards**: Visualize cache performance
- **Alerting**: Set up alerts for cache failures and performance degradation

## Conclusion

The caching system provides significant performance improvements while maintaining data consistency and system reliability. The multi-level approach ensures optimal performance with graceful degradation capabilities.

For additional support or questions, refer to the main project documentation or contact the development team.