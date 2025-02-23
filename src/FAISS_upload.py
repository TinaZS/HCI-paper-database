from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Initialize the Supabase client
url = os.getenv("SUPABASE_URL")  # Replace with your Supabase project URL
key = os.getenv("SUPABASE_KEY")  # Replace with your Supabase service or anon key
supabase: Client = create_client(url, key)

def replace_file(bucket_name: str, file_path: str, file_path_on_supabase: str):
    """
    Replace an existing file in Supabase Storage with a new file at the same URL.

    :param bucket_name: The name of the bucket where the file is stored.
    :param file_path: The local path to the new file to upload.
    :param file_name: The file name (including path) as it exists in the storage bucket.
    """
    with open(file_path, 'rb') as file:
        try:
            supabase.storage.from_(bucket_name).update(
                file=file, 
                path=file_path_on_supabase,
                file_options={"cacheControl": "3600", "upsert": True}
            )
            print(f"File '{file_path_on_supabase}' in bucket '{bucket_name}' replaced successfully.")
        except Exception as e:
            print(f"An error occurred: {e}")


