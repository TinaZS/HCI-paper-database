import requests


#def fetch_arxiv_data(query="cs.HC", max_results=1000,start=21000):
def fetch_arxiv_data(query,max_results,start):
    url = f"http://export.arxiv.org/api/query?search_query=cat:{query}&start={start}&sortBy=submittedDate&sortOrder=descending&max_results={max_results}"
    print(url,"\n")
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.content
    
    except requests.exceptions.RequestException as e:
        print("Error fetching from Arxiv: {e}")
        return None


#xml_data = fetch_arxiv_data()

# if xml_data:
#     print("Successfully fetched data from arXiv!")
# else:
#     print("Failed to fetch data.")

    
    


