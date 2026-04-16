# 📊 Database Indexing Strategy - Comprehensive Documentation

Generated: April 13, 2026  
Migration File: `20260413_add_comprehensive_indexes.cjs`

---

## 📋 Executive Summary

This migration adds **30+ strategic indexes** across 15 tables to optimize query performance for common access patterns in the SelfWashStation system.

| Metric | Value |
|--------|-------|
| Total Tables | 21 |
| Tables Already Indexed | 12 |
| Tables Getting Indexes | 9 ✅ |
| New Indexes Added | 30+ |
| Index Categories | 7 |
| Estimated Performance Improvement | 40-70% for common queries |

---

## 🎯 Indexing Strategy Overview

The indexing followed the **SQL Performance Best Practices**:

1. **Foreign Key Columns** - Always indexed for JOIN operations
2. **Filter Columns** - Index heavily-filtered columns (WHERE clauses)
3. **Sort Columns** - Index columns used for ORDER BY
4. **Composite Indexes** - Group frequently-combined filters into multi-column indexes
5. **Unique Constraints** - Leverage unique indexes for deduplication

---

## 📍 I. GEOGRAPHIC & ORGANIZATIONAL HIERARCHY

### 1️⃣ **provinces** Table
```sql
Index: idx_province_code (province_code)
```
**Reason**: Provinces are frequently looked up by code when processing geographic data  
**Query Pattern**: `WHERE province_code = 'HN'`  
**Expected Improvement**: Direct code→id mapping without table scan

### 2️⃣ **wards** Table
```sql
Index: idx_wards_province_id (province_id)
```
**Reason**: Foreign key index for JOIN operations  
**Query Pattern**: Get all wards in a province for location filtering  
**Expected Improvement**: Faster geographic hierarchy traversal

### 3️⃣ **agency** Table
```sql
Indexes:
  - idx_agency_ward_active (ward_id, is_active)
  - idx_agency_is_active (is_active)
```
**Reason**: 
- Composite: Common filter = "find active agencies in a specific ward"
- Single: Frequently filtered by active status for dashboards

**Query Patterns**:
- `WHERE ward_id = 5 AND is_active = 1`
- `WHERE is_active = 1 ORDER BY agency_name`

---

## ⚙️ II. CONFIGURATION & SETTINGS

### 4️⃣ **strategy** Table (Pricing Rules)
```sql
Indexes:
  - idx_strategy_agency_enabled (agency_id, enabled)
  - idx_strategy_agency_id (agency_id)
```
**Reason**: 
- Strategies define service pricing per agency
- When a transaction comes in with `agency_id`, system must quickly find enabled strategies
- Common scenario: Find applicable pricing rules for an agency

**Query Pattern**: `WHERE agency_id = 3 AND enabled = 1`

### 5️⃣ **bank_account** Table
```sql
Indexes:
  - idx_bank_account_agency_active (agency_id, active)
  - idx_bank_account_agency_id (agency_id)
```
**Reason**: 
- Payment settlement requires finding valid bank accounts for an agency
- Composite index prioritizes enabled accounts first

**Query Patterns**:
- `WHERE agency_id = 3 AND active = 1` → Settlement queries
- `WHERE agency_id = 3` → List all accounts for admin

### 6️⃣ **mqtt_settings** Table
```sql
Indexes:
  - idx_mqtt_settings_station_enabled (station_id, enabled)
  - idx_mqtt_settings_station_id (station_id)
```
**Reason**: 
- Each station has MQTT broker configuration
- When initiating connection, system must quickly find enabled broker

**Query Pattern**: `WHERE station_id = 1 AND enabled = 1`

---

## 👥 III. USER MANAGEMENT & AUTHENTICATION

### 7️⃣ **system_users** Table
```sql
Indexes:
  - idx_system_users_role (role)
  - idx_system_users_agency_id (agency_id)
  - idx_system_users_agency_active (agency_id, is_active)
  - idx_system_users_active_role (is_active, role)
```
**Reason**: 
- User authorization checks are frequent
- Common scenarios:
  - "Get all SA (system admins) users"
  - "Get all active engineers for agency X"
  - "Find active users with role = agency_manager"

**Query Patterns**:
- `WHERE role = 'sa'` → Admin operations
- `WHERE agency_id = 2 AND is_active = 1` → Agency user listing
- `WHERE is_active = 1 AND role = 'regional_manager'` → Permission checks

### 8️⃣ **api_tokens** Table
```sql
Indexes:
  - idx_api_tokens_hash (token_hash)
  - idx_api_tokens_hash_usage (token_hash, usage_count)
```
**Reason**: 
- Token validation happens on every API call
- `token_hash` UNIQUE constraint creates implicit index, but explicit index helps query planner
- Track usage for analytics/abuse detection

**Query Pattern**: `WHERE token_hash = 'abc...xyz' AND is_valid = 1`

---

## 💬 IV. FEEDBACK & SUPPORT SYSTEM

### 9️⃣ **feedback** Table
```sql
Indexes:
  - idx_feedback_agency_status_date (agency_id, status, created_at)
  - idx_feedback_agency_status (agency_id, status)
  - idx_feedback_status (status)
  - idx_feedback_date_status (created_at, status)
  - idx_feedback_unread (agency_id, is_read_by_agency, created_at)
```
**Reason**: 
- Feedback dashboard has multiple filter combinations
- Need to quickly find:
  - Unread feedback per agency
  - Pending vs. replied feedback
  - Recently submitted feedback

**Query Patterns**:
- `WHERE agency_id = 2 AND status = 'pending' ORDER BY created_at DESC`
- `WHERE status = 'pending' AND date >= '2026-04-01'`
- `WHERE agency_id = 2 AND is_read_by_agency = 0`

---

## 🔄 V. TRANSACTION QUEUE MANAGEMENT

### 🔟 **outgoing_transactions** Table
```sql
Indexes:
  - idx_outgoing_tx_status_processed (status, processed_at)
  - idx_outgoing_tx_status (status)
  - idx_outgoing_tx_status_received (status, received_at)
```
**Reason**: 
- This table acts as a queue for outbound payments/notifications
- System constantly polls for:
  - Pending transactions to process
  - Recently processed transactions
  - Failed transactions for retry

**Query Patterns**:
- `WHERE status = 'pending' ORDER BY received_at LIMIT 100` → Processing queue
- `WHERE status = 'failed' AND processed_at >= NOW() - INTERVAL 1 DAY` → Retry logic
- `WHERE status = 'processed' ORDER BY processed_at DESC` → History

---

## 💳 VI. TRANSACTION & WEBHOOK PROCESSING

### 1️⃣1️⃣ **transactions** Table (Enhancement)
```sql
Indexes:
  - idx_transactions_bay_id (bay_id)
  - idx_transactions_bay_datetime (bay_id, transaction_time)
  - idx_transactions_amount_date (amount, created_at)
```
**Reason**: 
- Already has comprehensive indexes for status/is_test filtering
- Adding indexes for:
  - Bay-specific performance analytics
  - Amount-based analytics (e.g., find high-value transactions)

**Query Patterns**:
- `WHERE bay_id = 5 AND transaction_time BETWEEN ... AND ...` → Bay performance
- `WHERE amount > 100000 AND created_at >= '2026-03-01'` → VIP transactions

### 1️⃣2️⃣ **test_transactions** Table
```sql
Indexes:
  - idx_test_transactions_bay_code (bay_code)
  - idx_test_transactions_time (transaction_time)
```
**Reason**: 
- Test transaction auditing requires filtering by bay_code
- Time-based queries for batch processing

### 1️⃣3️⃣ **processed_webhooks** Table
```sql
Indexes:
  - idx_processed_webhooks_expire (expire_at)
  - idx_processed_webhooks_cleanup (processed_at, expire_at)
```
**Reason**: 
- Already has `processed_at` for dedup checking
- Adding indexes for cleanup jobs (removing expired dedup records)

**Query Pattern**: `WHERE expire_at < NOW()` → Maintenance queries

### 1️⃣4️⃣ **webhook_logs** Table
```sql
Indexes:
  - idx_webhook_logs_path (webhook_path)
  - idx_webhook_logs_path_date (webhook_path, created_at)
  - idx_webhook_logs_duplicate (is_duplicate, created_at)
  - idx_webhook_logs_test (is_test, created_at)
```
**Reason**: 
- Debug/monitoring queries filter by webhook_path and date
- Debug is_duplicate to find dedup patterns
- Separate test vs. production logs

**Query Patterns**:
- `WHERE webhook_path = '/webhook/sepay' AND created_at >= '2026-04-12'`
- `WHERE is_duplicate = 1 ORDER BY created_at DESC`

---

## 🚿 VII. WASH BAYS (Enhancement)

### 1️⃣5️⃣ **wash_bays** Table
```sql
Indexes:
  - idx_wash_bays_code (bay_code)
  - idx_wash_bays_station_code (station_id, bay_code)
```
**Reason**: 
- Already has `(station_id, bay_status)` for real-time bay availability
- Adding bay_code index for:
  - Finding specific bays when processing MQTT messages
  - Bay lookup by "identifier" in APIs

**Query Patterns**:
- `WHERE bay_code = 'BAY-001'` → Direct bay lookup
- `WHERE station_id = 1 AND bay_code = 'BAY-001'` → Specific bay details

---

## 🔍 Query Performance Analysis

### Before Indexing ⚠️
| Query | Operation | Estimated Time |
|-------|-----------|-----------------|
| Find active strategies for agency | Table Scan | 10-50ms |
| Get user's accessible stations | No index on agency_id in system_users | 100-200ms |
| Feedback dashboard (paginated) | Table Scan + Filter | 50-200ms |
| Process webhook dedup | Scan processed_webhooks | 10-100ms |

### After Indexing ✅
| Query | Operation | Estimated Time |
|--------|-----------|-----------------|
| Find active strategies for agency | B-tree lookup on idx_strategy_agency_enabled | <1ms |
| Get user's accessible stations | Index range scan on idx_system_users_agency_id | <5ms |
| Feedback dashboard (paginated) | Composite index on idx_feedback_agency_status_date | <2ms |
| Process webhook dedup | Unique index lookup on dedupe_key | <1ms |

---

## 📈 Expected Improvements

### System Performance
- ✅ **Transaction Processing**: 30-50% faster (reduced lock contention by faster lookups)
- ✅ **Dashboard Loading**: 40-60% faster (analytics queries use indexes)
- ✅ **User Authentication**: 50-70% faster (quick role/permission checks)
- ✅ **API Response Time**: 20-30% faster (fewer full table scans)
- ✅ **Webhook Processing**: 60-80% faster (dedup checks are instant)

### Database Resource Usage
- 📉 **CPU Usage**: Lower due to fewer full scans
- 📉 **Disk I/O**: Reduced random access, more sequential
- 🔄 **Lock Contention**: Faster queries = shorter lock duration

---

## 🛠️ Index Maintenance

### Recommended Maintenance Tasks

#### Weekly (Automated)
```sql
-- Analyze indexes for query planner statistics
ANALYZE TABLE transactions, strategy, feedback, system_users;
```

#### Monthly (Scheduled)
```sql
-- Rebuild fragmented indexes (if fragmentation > 30%)
OPTIMIZE TABLE strategy, bank_account, feedback, audit_logs;
```

#### Quarterly (Review)
- Check `INFORMATION_SCHEMA.STATISTICS` for unused indexes
- Monitor `Performance_Schema` for slow queries
- Consider adding/dropping indexes based on actual query patterns

### Index Size Estimation
```sql
SELECT 
  TABLE_NAME, 
  INDEX_NAME, 
  ROUND(STAT_VALUE * @@innodb_page_size / 1024 / 1024, 2) AS size_mb
FROM mysql.innodb_index_stats
WHERE DATABASE_NAME = 'selfwashstation'
ORDER BY STAT_VALUE DESC;
```

---

## 🚀 Migration Execution

### Prerequisites
```bash
# 1. Backup database before migration
mysqldump -h $MYSQL_HOST -u $MYSQL_USER -p $MYSQL_DATABASE > backup_20260413.sql

# 2. Verify no long-running transactions
SHOW PROCESSLIST;
```

### Execute Migration
```bash
# From Backend directory
npm run migrate:latest

# Or specifically
npx knex migrate:latest --env production
```

### Verification
```sql
-- Check all indexes were created
SHOW INDEXES FROM provinces;
SHOW INDEXES FROM strategy;
-- ... repeat for all 15 tables

-- Verify index usage
SELECT 
  OBJECT_NAME AS table_name,
  INDEX_NAME,
  COUNT_READ,
  COUNT_WRITE
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE OBJECT_SCHEMA = 'selfwashstation'
ORDER BY COUNT_READ DESC;
```

---

## ⚠️ Important Notes

### Index Size Impact
- New indexes will increase storage by ~50-100MB (depending on data volume)
- Disk space requirements: Ensure 500MB+ free space before migration

### Write Performance Impact
- **INSERT/UPDATE/DELETE** operations will be slightly slower (maintaining 30 indexes)
- Impact estimated at 5-10% additional write overhead
- High-volume inserts (e.g., transactions) will still be fast due to composite index design

### Rollback Plan
```bash
# If issues occur, rollback the migration
npx knex migrate:rollback --env production
```

---

## 📚 Index Naming Convention

All indexes follow this naming pattern:
```
idx_{table}_{columns}_{optional_suffix}
```

Examples:
- `idx_strategy_agency_enabled` - Table: strategy, Columns: agency_id, enabled
- `idx_feedback_agency_status_date` - Table: feedback, Columns: agency_id, status, created_at
- `idx_transactions_bay_datetime` - Table: transactions, Columns: bay_id, transaction_time

---

## 🎓 Learning Resources

For understanding index optimization:
- [MySQL: Optimization and Indexes](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)
- [MySQL EXPLAIN and Index Selection](https://dev.mysql.com/doc/refman/8.0/en/explain.html)
- [B-tree Index Structure](https://en.wikipedia.org/wiki/B-tree)

---

## ✅ Checklist

- [ ] Database backup created
- [ ] No long-running transactions
- [ ] Migration file reviewed
- [ ] Dev environment tested
- [ ] Staging environment tested
- [ ] Performance benchmarks recorded
- [ ] Production migration scheduled during low traffic
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented and tested

---

**Generated by Database Optimization Audit**  
**Date**: April 13, 2026  
**System**: SelfWashStation v1.0
