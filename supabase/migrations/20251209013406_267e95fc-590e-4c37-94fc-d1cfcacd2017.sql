-- Update all users with is_admin=true to have role='admin' (except those already super_admin)
UPDATE game_users 
SET role = 'admin' 
WHERE is_admin = true AND role = 'user';