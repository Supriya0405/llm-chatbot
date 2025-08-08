from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from document_parser import load_documents

def build_vector_store():
    # Load documents
    docs = load_documents()
    print(f"✅ Loaded {len(docs)} documents")

    if not docs:
        raise ValueError("❌ No documents found. Please ensure documents are present and parsable.")

    # Create embeddings
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

    # Create FAISS vector store
    return FAISS.from_documents(docs, embeddings)

def get_relevant_chunks(query, vector_store, k=5):
    return vector_store.similarity_search(query, k=k)
