import requests
from src.fetch import fetch_arxiv_data
from src.parse_numbers import parse_numbers

#category=["AI","AR","CC","CE","CG","CL","CR","CV","CY","DB","DC","DC","DL","DM"]

def get_category_size(category):

    data=fetch_arxiv_data(category,1,0)
    category_size=parse_numbers(data)
    print("Category size is ",category_size)
    
    return category_size

    
    