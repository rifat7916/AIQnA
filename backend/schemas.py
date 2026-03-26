from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional, Any
from datetime import datetime
from uuid import UUID
from .models import QuestionType

# --- User Schemas ---
class UserBase(BaseModel):
    full_name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Document Schemas ---
class DocumentBase(BaseModel):
    file_name: str
    file_path: str

class DocumentCreate(DocumentBase):
    user_id: UUID

class DocumentResponse(DocumentBase):
    id: UUID
    user_id: UUID
    uploaded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# --- Option Schemas ---
class OptionBase(BaseModel):
    option_text: str
    is_correct: bool = False

class OptionCreate(OptionBase):
    pass

class OptionResponse(OptionBase):
    id: UUID
    question_id: UUID
    
    model_config = ConfigDict(from_attributes=True)

# --- Question Schemas ---
class QuestionBase(BaseModel):
    q_type: QuestionType
    question_text: str
    marks: Optional[int] = None
    correct_answer: Optional[str] = None

class QuestionCreate(QuestionBase):
    options: List[OptionCreate] = []

class QuestionResponse(QuestionBase):
    id: UUID
    test_paper_id: UUID
    
    model_config = ConfigDict(from_attributes=True)

class QuestionFullResponse(QuestionResponse):
    options: List[OptionResponse] = []

# --- TestPaper Schemas ---
class TestPaperBase(BaseModel):
    class_level: str
    subject: str
    chapter: str
    total_time: Optional[str] = None
    total_marks: Optional[str] = None
    generation_config: Optional[dict[str, Any]] = None

class TestPaperCreate(TestPaperBase):
    user_id: UUID
    document_id: Optional[UUID] = None

class TestPaperGenerateRequest(TestPaperBase):
    user_id: UUID
    document_id: Optional[UUID] = None

class TestPaperResponse(TestPaperBase):
    id: UUID
    user_id: UUID
    document_id: Optional[UUID]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TestPaperFullResponse(TestPaperResponse):
    questions: List[QuestionFullResponse] = []
