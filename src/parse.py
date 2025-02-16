import xml.etree.ElementTree as ET
from supabase_client import supabase
import time

def parse_arxiv_data(xml_data):
    """
    Parses arXiv XML data, checking supabase for duplicates
    Return new papers only
    """
    if xml_data is None:
        return []

    root = ET.fromstring(xml_data)
    papers = []

    #Extracting all titles
    titles = [entry.find("{http://www.w3.org/2005/Atom}title").text.strip()
              for entry in root.findall("{http://www.w3.org/2005/Atom}entry")]

    #Check against supabase for existing titles
    existing_titles = set()
    batch_size = 500  # Adjust based on Supabase limits

    for i in range(0, len(titles), batch_size):
        batch = titles[i:i + batch_size]

        try:
            response = supabase.table("papers").select("title").in_("title", batch).execute()

            
            if response.data:
                existing_titles.update(row["title"] for row in response.data)

             # Add a 1-second delay between requests

        except Exception as e:
            print(f"Batch {i} failed: {e}")
            time.sleep(1)
        
        if response.data:  # If Supabase returns data, add to existing_titles set
            existing_titles.update(row["title"] for row in response.data)


    #Parse & Skip
    for entry in root.findall("{http://www.w3.org/2005/Atom}entry"):
        title = entry.find("{http://www.w3.org/2005/Atom}title").text.strip()


        if title in existing_titles:
            continue

        abstract = entry.find("{http://www.w3.org/2005/Atom}summary").text.strip()
        link = entry.find("{http://www.w3.org/2005/Atom}id").text.strip()
        published_date = entry.find("{http://www.w3.org/2005/Atom}published").text.strip()

        authors = [author.find("{http://www.w3.org/2005/Atom}name").text.strip() 
                   for author in entry.findall("{http://www.w3.org/2005/Atom}author")]

        # Extract DOI if available
        doi_element = entry.find("{http://arxiv.org/schemas/atom}doi")
        doi = doi_element.text.strip() if doi_element is not None else None

        papers.append({
            "title": title,
            "authors": authors,
            "abstract": abstract,
            "link": link,
            "published_date": published_date,
            "doi": doi
        })

    return papers
