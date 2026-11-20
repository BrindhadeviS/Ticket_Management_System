-- 002_seed_categories.sql
-- Category > Sub Category > Item lists. Safe to re-run: existing rows are skipped.

INSERT INTO categories (name, sort_order) VALUES
  ('Accounts & Access', 1),
  ('Hardware & Devices', 2),
  ('Network & Connectivity', 3),
  ('Others', 4),
  ('Printing & Scanning', 5),
  ('Software & Applications', 6)
ON CONFLICT (name) DO NOTHING;

INSERT INTO sub_categories (category_id, name, sort_order)
SELECT c.category_id, v.sub, v.ord FROM (VALUES
  ('Accounts & Access', 'Password & Login', 1),
  ('Accounts & Access', 'Access Requests', 2),
  ('Hardware & Devices', 'Laptop & Desktop', 1),
  ('Hardware & Devices', 'Peripherals', 2),
  ('Network & Connectivity', 'Wi-Fi', 1),
  ('Network & Connectivity', 'VPN', 2),
  ('Others', 'General Request', 1),
  ('Printing & Scanning', 'Printers', 1),
  ('Printing & Scanning', 'Scanners', 2),
  ('Software & Applications', 'Communication & Meetings (Zoom, Webex, etc.)', 1),
  ('Software & Applications', 'Ladera Business Applications (ERP, HR, Finance)', 2),
  ('Software & Applications', 'Microsoft Office 365', 3),
  ('Software & Applications', 'Software Installation & Updates', 4),
  ('Software & Applications', 'Web Browsers (Chrome, Edge)', 5)
) AS v(cat, sub, ord)
JOIN categories c ON c.name = v.cat
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO items (sub_category_id, name, sort_order)
SELECT sc.sub_category_id, v.item, v.ord FROM (VALUES
  ('Accounts & Access', 'Password & Login', 'Forgot password', 1),
  ('Accounts & Access', 'Password & Login', 'Account locked', 2),
  ('Accounts & Access', 'Password & Login', 'MFA not working', 3),
  ('Accounts & Access', 'Access Requests', 'Shared folder access', 1),
  ('Accounts & Access', 'Access Requests', 'Application access', 2),
  ('Hardware & Devices', 'Laptop & Desktop', 'Not powering on', 1),
  ('Hardware & Devices', 'Laptop & Desktop', 'Slow performance', 2),
  ('Hardware & Devices', 'Laptop & Desktop', 'Battery issue', 3),
  ('Hardware & Devices', 'Peripherals', 'Keyboard / Mouse', 1),
  ('Hardware & Devices', 'Peripherals', 'Monitor', 2),
  ('Network & Connectivity', 'Wi-Fi', 'Cannot connect', 1),
  ('Network & Connectivity', 'Wi-Fi', 'Slow speed', 2),
  ('Network & Connectivity', 'VPN', 'Cannot connect', 1),
  ('Network & Connectivity', 'VPN', 'Frequent disconnects', 2),
  ('Others', 'General Request', 'Other', 1),
  ('Printing & Scanning', 'Printers', 'Printer offline', 1),
  ('Printing & Scanning', 'Printers', 'Paper jam', 2),
  ('Printing & Scanning', 'Printers', 'Need printer added', 3),
  ('Printing & Scanning', 'Scanners', 'Scan to email failing', 1),
  ('Software & Applications', 'Communication & Meetings (Zoom, Webex, etc.)', 'Cannot join meeting', 1),
  ('Software & Applications', 'Communication & Meetings (Zoom, Webex, etc.)', 'Audio / video issue', 2),
  ('Software & Applications', 'Ladera Business Applications (ERP, HR, Finance)', 'Login issue', 1),
  ('Software & Applications', 'Ladera Business Applications (ERP, HR, Finance)', 'Module access', 2),
  ('Software & Applications', 'Ladera Business Applications (ERP, HR, Finance)', 'Error in application', 3),
  ('Software & Applications', 'Microsoft Office 365', 'Outlook issue', 1),
  ('Software & Applications', 'Microsoft Office 365', 'Teams issue', 2),
  ('Software & Applications', 'Microsoft Office 365', 'Licence / activation', 3),
  ('Software & Applications', 'Software Installation & Updates', 'Need New Software Installed', 1),
  ('Software & Applications', 'Software Installation & Updates', 'Prompted for Admin Password to Update', 2),
  ('Software & Applications', 'Software Installation & Updates', 'Software is Missing from PC', 3),
  ('Software & Applications', 'Web Browsers (Chrome, Edge)', 'Browser crashing', 1),
  ('Software & Applications', 'Web Browsers (Chrome, Edge)', 'Extension / add-on issue', 2)
) AS v(cat, sub, item, ord)
JOIN categories c ON c.name = v.cat
JOIN sub_categories sc ON sc.category_id = c.category_id AND sc.name = v.sub
ON CONFLICT (sub_category_id, name) DO NOTHING;