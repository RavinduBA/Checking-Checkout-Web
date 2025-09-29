-- Create sample subscription plans for Creem.io integration
INSERT INTO plans (id, name, description, price_cents, billing_interval, currency, features, max_locations, max_rooms, product_id, is_active) VALUES
('starter', 'Starter', 'Perfect for small properties getting started', 2900, 'monthly', 'USD', 
 '["Basic booking management", "Payment processing", "Customer support", "Mobile access"]', 
 1, 10, 'prod_starter_monthly', true),

('professional', 'Professional', 'Ideal for growing hospitality businesses', 7900, 'monthly', 'USD', 
 '["Everything in Starter", "Advanced reporting", "Multi-property management", "Channel manager integration", "Priority support"]', 
 5, 50, 'prod_professional_monthly', true),

('enterprise', 'Enterprise', 'For large hospitality operations', 15900, 'monthly', 'USD', 
 '["Everything in Professional", "Custom integrations", "Dedicated support", "Advanced analytics", "White-label options"]', 
 999, 999, 'prod_enterprise_monthly', true),

('starter_annual', 'Starter (Annual)', 'Save 20% with annual billing', 2320, 'yearly', 'USD', 
 '["Basic booking management", "Payment processing", "Customer support", "Mobile access"]', 
 1, 10, 'prod_starter_annual', true),

('professional_annual', 'Professional (Annual)', 'Save 20% with annual billing', 6320, 'yearly', 'USD', 
 '["Everything in Starter", "Advanced reporting", "Multi-property management", "Channel manager integration", "Priority support"]', 
 5, 50, 'prod_professional_annual', true),

('enterprise_annual', 'Enterprise (Annual)', 'Save 20% with annual billing', 12720, 'yearly', 'USD', 
 '["Everything in Professional", "Custom integrations", "Dedicated support", "Advanced analytics", "White-label options"]', 
 999, 999, 'prod_enterprise_annual', true)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  billing_interval = EXCLUDED.billing_interval,
  currency = EXCLUDED.currency,
  features = EXCLUDED.features,
  max_locations = EXCLUDED.max_locations,
  max_rooms = EXCLUDED.max_rooms,
  product_id = EXCLUDED.product_id,
  is_active = EXCLUDED.is_active;