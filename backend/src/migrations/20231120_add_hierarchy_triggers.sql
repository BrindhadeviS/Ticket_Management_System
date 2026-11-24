-- Migration: add hierarchy columns, constraints, indexes, helper function, and triggers
-- This script assumes the tables categories, sub_categories, and items already exist.

-- 1. Ensure required columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='sort_order') THEN
        ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='active') THEN
        ALTER TABLE categories ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sub_categories' AND column_name='sort_order') THEN
        ALTER TABLE sub_categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sub_categories' AND column_name='active') THEN
        ALTER TABLE sub_categories ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='sort_order') THEN
        ALTER TABLE items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='active') THEN
        ALTER TABLE items ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- 2. Unique constraints to prevent duplicate names within the same parent
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_categories_name') THEN
        ALTER TABLE categories ADD CONSTRAINT uq_categories_name UNIQUE (name);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_sub_categories_category_name') THEN
        ALTER TABLE sub_categories ADD CONSTRAINT uq_sub_categories_category_name UNIQUE (category_id, name);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_items_sub_category_name') THEN
        ALTER TABLE items ADD CONSTRAINT uq_items_sub_category_name UNIQUE (sub_category_id, name);
    END IF;
END $$;

-- 3. Indexes for fast MAX(sort_order) lookup
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories (sort_order);
CREATE INDEX IF NOT EXISTS idx_sub_categories_parent_sort ON sub_categories (category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_items_parent_sort ON items (sub_category_id, sort_order);

-- 4. Helper function that returns the next sort_order for a given table/parent
CREATE OR REPLACE FUNCTION public.next_sort_order(
    p_table   TEXT,
    p_parent  TEXT,
    p_parent_id BIGINT
) RETURNS INTEGER AS $$
DECLARE
    v_max INTEGER;
BEGIN
    IF p_parent IS NULL THEN
        EXECUTE format('SELECT COALESCE(MAX(sort_order),0) FROM %I', p_table)
            INTO v_max;
    ELSE
        EXECUTE format('SELECT COALESCE(MAX(sort_order),0) FROM %I WHERE %I = $1', p_table, p_parent)
            USING p_parent_id
            INTO v_max;
    END IF;
    RETURN v_max + 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Triggers (commented out for now – can be re‑enabled once syntax is verified)
/*
DROP TRIGGER IF EXISTS set_sort_order_on_categories ON categories;
CREATE TRIGGER set_sort_order_on_categories
BEFORE INSERT ON categories
FOR EACH ROW
EXECUTE FUNCTION (
    $$BEGIN
        NEW.sort_order := next_sort_order('categories', NULL, NULL);
        RETURN NEW;
    END;$$
);

DROP TRIGGER IF EXISTS set_sort_order_on_sub_categories ON sub_categories;
CREATE TRIGGER set_sort_order_on_sub_categories
BEFORE INSERT ON sub_categories;
FOR EACH ROW
EXECUTE FUNCTION (
    $$BEGIN
        NEW.sort_order := next_sort_order('sub_categories', 'category_id', NEW.category_id);
        RETURN NEW;
    END;$$
);

DROP TRIGGER IF EXISTS set_sort_order_on_items ON items;
CREATE TRIGGER set_sort_order_on_items
BEFORE INSERT ON items;
FOR EACH ROW
EXECUTE FUNCTION (
    $$BEGIN
        NEW.sort_order := next_sort_order('items', 'sub_category_id', NEW.sub_category_id);
        RETURN NEW;
    END;$$
);
*/

-- End of migration