// Fill in your own project values from Supabase > Project Settings > API
const SUPABASE_URL = "https://xhrasdltvznpncozcrft.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhocmFzZGx0dnpucG5jb3pjcmZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MTA3MDksImV4cCI6MjEwNDk4NjcwOX0.Nq_jAEaNv7kK1YrrjfXvH9YPVVoPvNWIaRHfNzAZtU4";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
