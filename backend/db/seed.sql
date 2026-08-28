USE corporate_gifting;

-- Gift catalogue (matches the "Gift Collection" step in the design)
INSERT INTO gifts (name, description, active) VALUES
  ('Signature Gift Box', 'Premium curated corporate gift set, elegantly packaged.', 1),
  ('Luxe Hamper',        'A generous hamper of gourmet treats and keepsakes.',      1),
  ('Desk Kit',           'A tidy desk essentials kit for the modern workspace.',    1);

-- Employees (only name + email are stored, by design)
INSERT INTO employees (first_name, last_name, email) VALUES
  ('John',  'Doe',   'john@company.com'),
  ('Jane',  'Smith', 'jane@company.com'),
  ('David', 'Kumar', 'david@company.com');

-- Sample orders so the admin dashboard has data on first run
INSERT INTO orders
  (order_code, gift_id, gift_name, quantity, recipient_name, client_email, phone, address, city, state, pincode, gift_message, status, created_at)
VALUES
  ('ORD-1001', 1, 'Signature Gift Box', 1, 'John Doe',   'john@company.com',  '+91 90000 00001', '12 MG Road',   'Bengaluru', 'Karnataka', '560001', 'Congratulations!', 'Submitted',  NOW() - INTERVAL 0 DAY),
  ('ORD-1002', 2, 'Luxe Hamper',        1, 'Jane Smith', 'jane@company.com',  '+91 90000 00002', '48 Residency', 'Bengaluru', 'Karnataka', '560025', 'Well done!',       'Processing', NOW() - INTERVAL 0 DAY),
  ('ORD-1003', 1, 'Signature Gift Box', 2, 'David Kumar','david@company.com', '+91 90000 00003', '7 Church St',  'Bengaluru', 'Karnataka', '560001', 'Thank you!',       'Completed',  NOW() - INTERVAL 1 DAY),
  ('ORD-1004', 3, 'Desk Kit',           1, 'Aisha Khan', 'aisha@company.com', '+91 90000 00004', '3 Brigade Rd', 'Bengaluru', 'Karnataka', '560001', NULL,               'Completed',  NOW() - INTERVAL 2 DAY),
  ('ORD-1005', 2, 'Luxe Hamper',        1, 'Rahul Nair', 'rahul@company.com', '+91 90000 00005', '9 Indiranagar','Bengaluru', 'Karnataka', '560038', 'Happy holidays',   'Completed',  NOW() - INTERVAL 3 DAY);
