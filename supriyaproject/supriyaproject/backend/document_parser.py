from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    UnstructuredEmailLoader
)
import os

def load_documents():
    data_dir = "./documents"  # You can change this path as needed

    documents = []

    if not os.path.exists(data_dir):
        print("❌ Document directory not found.")
        return documents

    for filename in os.listdir(data_dir):
        file_path = os.path.join(data_dir, filename)

        try:
            if filename.endswith(".pdf"):
                loader = PyPDFLoader(file_path)
            elif filename.endswith(".docx"):
                loader = Docx2txtLoader(file_path)
            elif filename.endswith(".eml"):
                loader = UnstructuredEmailLoader(file_path)
            else:
                print(f"⚠️ Skipping unsupported file: {filename}")
                continue

            docs = loader.load()
            documents.extend(docs)
            print(f"✅ Loaded {len(docs)} from {filename}")

        except Exception as e:
            print(f"❌ Error loading {filename}: {e}")

    return documents
