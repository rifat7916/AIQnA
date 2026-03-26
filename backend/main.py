import os
import uuid
from typing import List
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from .database import engine, Base, get_db
from . import models, schemas

app = FastAPI(title="AIQnA Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        # Create tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)

@app.post("/users/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(models.User).where(models.User.email == user.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # In a real app, hash the password using passlib
    fake_hashed_password = user.password + "notreallyhashed"
    
    db_user = models.User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=fake_hashed_password
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@app.post("/documents/upload", response_model=schemas.DocumentResponse)
async def upload_document(
    user_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    # Ensure upload directory exists
    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{uuid.uuid4()}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    db_document = models.Document(
        user_id=user_id,
        file_name=file.filename,
        file_path=file_path
    )
    db.add(db_document)
    await db.commit()
    await db.refresh(db_document)
    return db_document

# Mock AI Service
async def mock_gemini_generate(request: schemas.TestPaperGenerateRequest):
    return [
        {
            "q_type": models.QuestionType.MCQ,
            "question_text": "What is the capital of Bangladesh?",
            "marks": 1,
            "correct_answer": "Dhaka",
            "options": [
                {"option_text": "Dhaka", "is_correct": True},
                {"option_text": "Chittagong", "is_correct": False},
                {"option_text": "Sylhet", "is_correct": False},
                {"option_text": "Rajshahi", "is_correct": False},
            ]
        },
        {
            "q_type": models.QuestionType.SHORT,
            "question_text": "Explain the water cycle briefly.",
            "marks": 5,
            "correct_answer": "Evaporation, Condensation, Precipitation.",
            "options": []
        }
    ]

@app.post("/test-papers/generate", response_model=schemas.TestPaperFullResponse)
async def generate_test_paper(
    request: schemas.TestPaperGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    # 1. Call Mock AI Service
    generated_questions_data = await mock_gemini_generate(request)
    
    # 2. Create TestPaper
    db_test_paper = models.TestPaper(
        user_id=request.user_id,
        document_id=request.document_id,
        class_level=request.class_level,
        subject=request.subject,
        chapter=request.chapter,
        total_time=request.total_time,
        total_marks=request.total_marks,
        generation_config=request.generation_config
    )
    db.add(db_test_paper)
    await db.flush() # Get the ID without committing
    
    # 3. Insert Questions and Options
    for q_data in generated_questions_data:
        db_question = models.Question(
            test_paper_id=db_test_paper.id,
            q_type=q_data["q_type"],
            question_text=q_data["question_text"],
            marks=q_data["marks"],
            correct_answer=q_data["correct_answer"]
        )
        db.add(db_question)
        await db.flush()
        
        for opt_data in q_data.get("options", []):
            db_option = models.Option(
                question_id=db_question.id,
                option_text=opt_data["option_text"],
                is_correct=opt_data["is_correct"]
            )
            db.add(db_option)
            
    await db.commit()
    
    # 4. Fetch the complete paper to return
    result = await db.execute(
        select(models.TestPaper)
        .where(models.TestPaper.id == db_test_paper.id)
        .options(
            selectinload(models.TestPaper.questions)
            .selectinload(models.Question.options)
        )
    )
    complete_paper = result.scalars().first()
    return complete_paper

@app.get("/test-papers/{paper_id}", response_model=schemas.TestPaperFullResponse)
async def get_test_paper(paper_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.TestPaper)
        .where(models.TestPaper.id == paper_id)
        .options(
            selectinload(models.TestPaper.questions)
            .selectinload(models.Question.options)
        )
    )
    test_paper = result.scalars().first()
    
    if not test_paper:
        raise HTTPException(status_code=404, detail="Test paper not found")
        
    return test_paper
