// ✅ Fixed: src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rhanvchqlilmzxmufode.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoYW52Y2hxbGlsbXp4bXVmb2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MDg5MzIsImV4cCI6MjA2ODA4NDkzMn0.OQ2cN38ZpK-J9GBCFMbqgSWxZxhl229CcBTr6EYS_as';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);