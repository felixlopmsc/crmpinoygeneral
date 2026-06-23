-- Add soft-delete column to policies
ALTER TABLE policies ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for efficient filtering of non-deleted policies
CREATE INDEX IF NOT EXISTS idx_policies_deleted_at ON policies(deleted_at) WHERE deleted_at IS NULL;
