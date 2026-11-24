-- 005_category_department_mapping.sql
-- Creates mapping table between categories and departments for category-based support routing

CREATE TABLE IF NOT EXISTS category_department_mapping (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  department VARCHAR(100) NOT NULL,
  UNIQUE(category_id, department)
);

CREATE INDEX IF NOT EXISTS idx_cat_dept_mapping_dept ON category_department_mapping(department);
CREATE INDEX IF NOT EXISTS idx_cat_dept_mapping_cat ON category_department_mapping(category_id);

-- Seed initial mapping for default categories
-- 1. Hardware & Devices -> IT Infrastructure
INSERT INTO category_department_mapping (category_id, department)
SELECT c.category_id, 'IT Infrastructure'
FROM categories c WHERE c.name = 'Hardware & Devices'
ON CONFLICT (category_id, department) DO NOTHING;

-- 2. Network & Connectivity -> IT Infrastructure
INSERT INTO category_department_mapping (category_id, department)
SELECT c.category_id, 'IT Infrastructure'
FROM categories c WHERE c.name = 'Network & Connectivity'
ON CONFLICT (category_id, department) DO NOTHING;

-- 3. Printing & Scanning -> IT Infrastructure, IT Operations
INSERT INTO category_department_mapping (category_id, department)
SELECT c.category_id, 'IT Infrastructure'
FROM categories c WHERE c.name = 'Printing & Scanning'
ON CONFLICT (category_id, department) DO NOTHING;

INSERT INTO category_department_mapping (category_id, department)
SELECT c.category_id, 'IT Operations'
FROM categories c WHERE c.name = 'Printing & Scanning'
ON CONFLICT (category_id, department) DO NOTHING;

-- 4. Accounts & Access -> IT Operations
INSERT INTO category_department_mapping (category_id, department)
SELECT c.category_id, 'IT Operations'
FROM categories c WHERE c.name = 'Accounts & Access'
ON CONFLICT (category_id, department) DO NOTHING;

-- 5. Software & Applications -> IT Operations, Engineering
INSERT INTO category_department_mapping (category_id, department)
SELECT c.category_id, 'IT Operations'
FROM categories c WHERE c.name = 'Software & Applications'
ON CONFLICT (category_id, department) DO NOTHING;

INSERT INTO category_department_mapping (category_id, department)
SELECT c.category_id, 'Engineering'
FROM categories c WHERE c.name = 'Software & Applications'
ON CONFLICT (category_id, department) DO NOTHING;

-- 6. Office Facilities -> HR
INSERT INTO category_department_mapping (category_id, department)
SELECT c.category_id, 'HR'
FROM categories c WHERE c.name = 'Office Facilities'
ON CONFLICT (category_id, department) DO NOTHING;
