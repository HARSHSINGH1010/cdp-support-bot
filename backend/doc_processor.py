import aiohttp
import asyncio
from bs4 import BeautifulSoup
import html2text
from typing import Dict, List, Optional
import chromadb
import os
from pathlib import Path
import logging
import functools

class DocProcessor:
    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DocProcessor, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.doc_urls = {
            "segment": "https://segment.com/docs/",
            "mparticle": "https://docs.mparticle.com/",
            "lytics": "https://docs.lytics.com/",
            "zeotap": "https://docs.zeotap.com/home/en-us/"
        }
        
        # Initialize ChromaDB for document storage
        try:
            self.db_path = Path("./doc_db")
            if self.db_path.exists():
                import shutil
                shutil.rmtree(self.db_path)
            self.db_path.mkdir(exist_ok=True)
            
            # Use the new client format with optimized settings
            self.chroma_client = chromadb.PersistentClient(
                path=str(self.db_path),
                settings=chromadb.Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Create collections for each CDP
            self.collections = {}
            for platform in self.doc_urls.keys():
                try:
                    self.collections[platform] = self.chroma_client.create_collection(
                        name=platform,
                        metadata={"hnsw:space": "cosine"}
                    )
                except Exception as e:
                    logging.error(f"Error creating collection for {platform}: {str(e)}")
                    
        except Exception as e:
            logging.error(f"Error initializing ChromaDB: {str(e)}")
            self.chroma_client = None
            
        self._initialized = True

    @functools.lru_cache(maxsize=100)
    async def fetch_page(self, url: str) -> Optional[str]:
        """Fetch and parse a documentation page with caching."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # Remove script and style elements
                        for script in soup(["script", "style"]):
                            script.decompose()
                            
                        # Convert HTML to markdown-style text
                        h = html2text.HTML2Text()
                        h.ignore_links = False
                        text = h.handle(str(soup))
                        return text
                    else:
                        logging.error(f"Error fetching {url}: Status {response.status}")
                        return None
        except Exception as e:
            logging.error(f"Error fetching {url}: {str(e)}")
            return None

    async def process_documentation(self, platform: str) -> bool:
        """Process and store documentation for a specific platform."""
        if platform not in self.doc_urls or not self.chroma_client:
            return False
            
        try:
            base_url = self.doc_urls[platform]
            content = await self.fetch_page(base_url)
            
            if content and platform in self.collections:
                # Store in ChromaDB
                collection = self.collections[platform]
                collection.add(
                    documents=[content],
                    metadatas=[{"source": base_url}],
                    ids=[f"{platform}_main"]
                )
                return True
            return False
        except Exception as e:
            logging.error(f"Error processing documentation for {platform}: {str(e)}")
            return False

    @functools.lru_cache(maxsize=100)
    def search_documentation(self, platform: str, query: str, limit: int = 5) -> List[Dict[str, str]]:
        """Search the documentation for relevant content with caching."""
        if not self.chroma_client or platform not in self.collections:
            logging.error("ChromaDB client not initialized or platform not found")
            return []
            
        try:
            collection = self.collections[platform]
            results = collection.query(
                query_texts=[query],
                n_results=limit
            )
            
            if results and results['documents']:
                return [
                    {
                        "content": doc,
                        "source": meta["source"]
                    }
                    for doc, meta in zip(results['documents'][0], results['metadatas'][0])
                ]
            return []
        except Exception as e:
            logging.error(f"Error searching documentation: {str(e)}")
            return []

    async def refresh_all_documentation(self) -> Dict[str, bool]:
        """Refresh documentation for all platforms."""
        if not self.chroma_client:
            logging.error("ChromaDB client not initialized")
            return {platform: False for platform in self.doc_urls.keys()}
            
        results = {}
        for platform in self.doc_urls.keys():
            results[platform] = await self.process_documentation(platform)
        return results 