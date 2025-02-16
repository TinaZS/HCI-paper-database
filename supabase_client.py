from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Read credentials from .env file
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Create a Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Supabase client initialized successfully")
