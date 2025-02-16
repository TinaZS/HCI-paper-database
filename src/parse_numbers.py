import xml.etree.ElementTree as ET

def parse_numbers(xml_data):
    #print(xml_data)
    
    if xml_data is None:
        return []
    
    # Define namespaces
    namespaces = {
        "atom": "http://www.w3.org/2005/Atom",
        "opensearch": "http://a9.com/-/spec/opensearch/1.1/"
    }

    root = ET.fromstring(xml_data)
    
     # Extract totalResults correctly from the feed level
    total_results_element = root.find("opensearch:totalResults", namespaces)

    if total_results_element is not None:
        total_results = total_results_element.text.strip()
        print(f"Total Results: {total_results}")
        return int(total_results)  # Convert to int for numerical operations
    
    return 0  # Return 0 if not found