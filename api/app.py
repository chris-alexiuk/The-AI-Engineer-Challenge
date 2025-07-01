# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
import tempfile
import asyncio
from typing import Optional, Dict
import sys

# Add the parent directory to the Python path to import aimakerspace
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
from aimakerspace.vectordatabase import VectorDatabase
from aimakerspace.openai_utils.embedding import EmbeddingModel
from aimakerspace.openai_utils.chatmodel import ChatOpenAI

# Initialize FastAPI application with a title
app = FastAPI(title="PDF RAG Chat API")

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# Global storage for vector databases (in production, use persistent storage)
vector_databases: Dict[str, VectorDatabase] = {}
document_texts: Dict[str, list] = {}

# Define the data model for chat requests
class ChatRequest(BaseModel):
    user_message: str
    model: Optional[str] = "gpt-4o-mini"
    api_key: str

# Define the data model for RAG chat requests  
class RAGChatRequest(BaseModel):
    user_message: str
    document_id: str
    model: Optional[str] = "gpt-4o-mini"
    api_key: str
    k: Optional[int] = 3  # Number of relevant chunks to retrieve

# Define the main chat endpoint (original functionality)
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Initialize OpenAI client with the provided API key
        client = OpenAI(api_key=request.api_key)
        
        # Create an async generator function for streaming responses
        async def generate():
            # Create a streaming chat completion request
            stream = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": request.user_message}
                ],
                stream=True  # Enable streaming response
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        # Handle any errors that occur during processing
        raise HTTPException(status_code=500, detail=str(e))

# PDF upload and indexing endpoint
@app.post("/api/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    api_key: str = Form(...)
):
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Set the OpenAI API key as environment variable for aimakerspace
        os.environ["OPENAI_API_KEY"] = api_key
        
        # Create a temporary file to save the uploaded PDF
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Load and process the PDF
            pdf_loader = PDFLoader(temp_file_path)
            documents = pdf_loader.load_documents()
            
            # Split the documents into chunks
            text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = text_splitter.split_texts(documents)
            
            # Create embeddings and build vector database
            embedding_model = EmbeddingModel()
            vector_db = VectorDatabase(embedding_model=embedding_model)
            vector_db = await vector_db.abuild_from_list(chunks)
            
            # Generate a unique document ID
            document_id = f"doc_{hash(file.filename + str(len(chunks)))}"
            
            # Store the vector database and chunks
            vector_databases[document_id] = vector_db
            document_texts[document_id] = chunks
            
            return {
                "message": "PDF uploaded and indexed successfully",
                "document_id": document_id,
                "chunks_count": len(chunks),
                "filename": file.filename
            }
            
        finally:
            # Clean up the temporary file
            os.unlink(temp_file_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

# RAG chat endpoint
@app.post("/api/rag-chat")
async def rag_chat(request: RAGChatRequest):
    try:
        # Check if document exists
        if request.document_id not in vector_databases:
            raise HTTPException(status_code=404, detail="Document not found. Please upload a PDF first.")
        
        # Set the OpenAI API key as environment variable
        os.environ["OPENAI_API_KEY"] = request.api_key
        
        # Get the vector database for this document
        vector_db = vector_databases[request.document_id]
        
        # Retrieve relevant chunks
        relevant_chunks = vector_db.search_by_text(
            request.user_message, 
            k=request.k, 
            return_as_text=True
        )
        
        # Create context from relevant chunks
        context = "\n\n".join(relevant_chunks)
        
        # Create the system prompt with context
        system_prompt = f"""You are a helpful assistant that answers questions based on the provided document context. 
        Use the following context to answer the user's question. If the answer cannot be found in the context, 
        say that you cannot find the information in the provided document.

        Context:
        {context}
        """
        
        # Initialize chat model and create streaming response
        async def generate():
            client = OpenAI(api_key=request.api_key)
            stream = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.user_message}
                ],
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get uploaded documents list
@app.get("/api/documents")
async def get_documents():
    return {
        "documents": [
            {"id": doc_id, "chunks_count": len(document_texts[doc_id])}
            for doc_id in document_texts.keys()
        ]
    }

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
