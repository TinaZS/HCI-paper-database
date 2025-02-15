import xml.etree.ElementTree as ET

def parse_arxiv_data(xml_data,existing_titles):
    if xml_data is None:
        return []
    
    root = ET.fromstring(xml_data)
    papers = []

    for entry in root.findall("{http://www.w3.org/2005/Atom}entry"):

        title = entry.find("{http://www.w3.org/2005/Atom}title").text.strip()

        # Skip duplicates
        if title in existing_titles:
            print(f"Skipping duplicate: {title}")
            continue
        
        abstract = entry.find("{http://www.w3.org/2005/Atom}summary").text.strip()
        link = entry.find("{http://www.w3.org/2005/Atom}id").text.strip()
        published_date = entry.find("{http://www.w3.org/2005/Atom}published").text.strip()

        # There might be multiple authors, extracting all of them
        authors = [author.find("{http://www.w3.org/2005/Atom}name").text.strip() 
                   for author in entry.findall("{http://www.w3.org/2005/Atom}author")]

        # Extract doi only if it's available in the xml
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

    