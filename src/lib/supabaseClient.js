import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ocdojeovjdzjpuijqazd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZG9qZW92amR6anB1aWpxYXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwOTc4MTIsImV4cCI6MjA2NzY3MzgxMn0.GQ7Bpki3FKG43VdyCzCKbyXiBL923neoWl9wOhPCk4k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);