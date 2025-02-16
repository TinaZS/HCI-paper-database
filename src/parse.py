import xml.etree.ElementTree as ET
from supabase_client import supabase

def parse_arxiv_data(xml_data):
    """
    Parses arXiv XML data, checking Supabase for duplicates.
    Returns only new papers that are not already in the database.
    """
    if xml_data is None:
        return []

    root = ET.fromstring(xml_data)
    papers = []

    existing_titles_response = supabase.table("new_papers").select("title").execute()
    existing_titles = {row["title"] for row in existing_titles_response.data} if existing_titles_response.data else set()

    seen_titles = set()
    unique_papers = []

    for entry in root.findall("{http://www.w3.org/2005/Atom}entry"):
        title = entry.find("{http://www.w3.org/2005/Atom}title").text.strip()

        if title in existing_titles or title in seen_titles:
            continue  # Skip duplicates

        abstract = entry.find("{http://www.w3.org/2005/Atom}summary").text.strip()
        link = entry.find("{http://www.w3.org/2005/Atom}id").text.strip()
        published_date = entry.find("{http://www.w3.org/2005/Atom}published").text.strip()

        authors = [author.find("{http://www.w3.org/2005/Atom}name").text.strip() 
                   for author in entry.findall("{http://www.w3.org/2005/Atom}author")]

        # Extract DOI if available
        doi_element = entry.find("{http://arxiv.org/schemas/atom}doi")
        doi = doi_element.text.strip() if doi_element is not None else None

        unique_papers.append({
            "title": title,
            "authors": authors,
            "abstract": abstract,
            "link": link,
            "published_date": published_date,
            "doi": doi
        })

        seen_titles.add(title)  

    return unique_papers 
