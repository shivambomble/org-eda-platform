# Soft Delete Implementation for Datasets

## Overview
Implemented soft delete functionality for datasets instead of hard delete. This allows datasets to be marked as deleted without permanently removing them from the database, enabling recovery and audit trails.

## Changes Made

### 1. Database Schema
**File:** `docker/init_sql/03_soft_delete_datasets.sql`

Added soft delete support:
```sql
ALTER TABLE datasets ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX idx_datasets_deleted_at ON datasets(deleted_at);
CREATE INDEX idx_datasets_project_deleted ON datasets(project_id, deleted_at);
```

**Key Points:**
- `deleted_at` column stores the timestamp when a dataset was deleted
- `NULL` value means the dataset is active
- Non-NULL value means the dataset is soft-deleted
- Indexes added for performance optimization

### 2. Backend Controller Updates
**File:** `backend/src/datasets/controller.ts`

#### Delete Function (Soft Delete)
```typescript
// Old: DELETE FROM datasets WHERE id = $1
// New: UPDATE datasets SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1
```

#### New Restore Function
Added `restoreDataset()` function to restore soft-deleted datasets:
- Only admins can restore datasets
- Restores by setting `deleted_at = NULL`
- Includes proper access control checks

### 3. Route Updates
**File:** `backend/src/datasets/routes.ts`

Added new restore endpoint:
```
POST /projects/:projectId/datasets/:datasetId/restore
```

### 4. Query Updates
Updated all queries to exclude soft-deleted datasets:

**Files Updated:**
- `backend/src/datasets/transform_controller.ts`
- `backend/src/datasets/search_controller.ts`

**Pattern:**
```sql
-- Before
WHERE d.project_id = $1

-- After
WHERE d.project_id = $1 AND d.deleted_at IS NULL
```

### 5. Frontend Updates
**File:** `frontend/src/pages/projects/DatasetList.tsx`

Added logging and delay for better UX:
```typescript
const handleDelete = async (datasetId: string) => {
  // ... delete call
  console.log('Delete response:', response.data);
  setTimeout(() => refresh(), 500); // Small delay for backend processing
};
```

**File:** `frontend/src/pages/projects/ProjectDetails.tsx`

Enhanced cache clearing:
```typescript
const handleRefresh = async () => {
  await client.cache.evict({ id: `projects_by_pk:${id}` });
  await client.cache.gc();
  await refetch();
};
```

## Benefits

1. **Data Recovery** - Deleted datasets can be restored by admins
2. **Audit Trail** - `deleted_at` timestamp shows when deletion occurred
3. **Data Integrity** - Related records (cleaning_logs, eda_results) remain intact
4. **Performance** - Soft delete is faster than hard delete with cascades
5. **Compliance** - Supports data retention policies

## API Endpoints

### Delete Dataset (Soft Delete)
```
DELETE /api/projects/:projectId/datasets/:datasetId
```
- Marks dataset as deleted
- Sets `deleted_at` to current timestamp
- Related data remains in database

### Restore Dataset
```
POST /api/projects/:projectId/datasets/:datasetId/restore
```
- Restores soft-deleted dataset
- Sets `deleted_at` to NULL
- Admin only

## Database Behavior

### Soft-Deleted Datasets
- Not shown in UI queries
- Not included in search results
- Not included in EDA analysis
- Can be restored by admin
- Timestamp preserved for audit

### Related Records
- Cleaning logs: Remain in database
- EDA results: Remain in database
- Inventory alerts: Remain in database
- All linked via `dataset_id` foreign key

## Migration Steps

1. Run migration: `docker/init_sql/03_soft_delete_datasets.sql`
2. Restart backend service
3. Existing datasets will have `deleted_at = NULL` (active)
4. New deletes will use soft delete

## Future Enhancements

1. Add admin UI to view/restore deleted datasets
2. Add automatic hard delete after retention period (e.g., 90 days)
3. Add audit log table for tracking all deletions
4. Add bulk restore functionality
5. Add deletion reason/comment field
