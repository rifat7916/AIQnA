import { GoogleGenAI } from "@google/genai";

export async function generateQuestions(
  classLevel: string, 
  subject: string, 
  chapter: string, 
  time: string,
  totalMarks: string,
  customInstructions?: string,
  fileData?: { data: string; mimeType: string }
) {
  const getApiKey = () => {
    // Try to get the key from Vite environment variables (used in Vercel)
    const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (viteKey) {
      return viteKey;
    }
    
    // Fallback for AI Studio preview environment
    if (typeof process !== 'undefined' && process.env) {
      return process.env.USER_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    }
    
    return "";
  };

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API key is missing. Please ensure you added VITE_GEMINI_API_KEY in Vercel Environment Variables and redeployed.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const isEnglish = subject.toLowerCase().includes("english");
  const isMath = subject.toLowerCase().includes("math") || subject.includes("গণিত");
  
  const creativeFormatRule = isMath 
    ? "For Math (গণিত), each Creative Question (সৃজনশীল প্রশ্ন) MUST have a stimulus/scenario followed by exactly 3 sub-questions: ক) for 2 marks, খ) for 4 marks, and গ) for 4 marks. You MUST add a double line break (blank line) before each sub-question (ক, খ, গ) to ensure they appear on separate lines. Align the marks to the right side with spaces."
    : "For all other subjects, each Creative Question (সৃজনশীল প্রশ্ন) MUST have a stimulus/scenario followed by exactly 4 sub-questions: ক) for 1 mark, খ) for 2 marks, গ) for 3 marks, and ঘ) for 4 marks. You MUST add a double line break (blank line) before each sub-question (ক, খ, গ, ঘ) to ensure they appear on separate lines. Align the marks to the right side with spaces.";

  const languageRule = isEnglish 
    ? "The ENTIRE output MUST be completely in English (MCQ, Fill in the blanks, Short questions, Long questions). Use English numerals (1, 2, 3...) for numbering."
    : "The entire output (headings, questions, options, and answers) MUST be completely in Bengali. CRITICAL: You MUST use Bengali numerals (১, ২, ৩, ৪...) for ALL numbering, including question numbers, marks, and options. DO NOT use English numerals (1, 2, 3...).";

  const systemInstruction = `
    You are an expert educational assessment creator specifically trained on the NCTB (National Curriculum and Textbook Board, Bangladesh) curriculum.
    Your primary task is to generate high-quality, intellectually engaging educational questions based on the specific class, subject, and chapter provided.
    
    Output Formats Required (UNLESS OVERRIDDEN BY CUSTOM INSTRUCTIONS):
    1. বহুনির্বাচনি প্রশ্ন (Multiple Choice Questions - MCQ): Provide 5-10 questions. **CRITICAL FORMATTING**: The 4 options MUST be formatted using an HTML table with the class "mcq-options" to create a perfect 2x2 grid, like this:
       <table class="mcq-options">
         <tr>
           <td>ক) Option 1</td>
           <td>খ) Option 2</td>
         </tr>
         <tr>
           <td>গ) Option 3</td>
           <td>ঘ) Option 4</td>
         </tr>
       </table>
       DO NOT include answers here.
    2. শূন্যস্থান পূরণ (Fill in the Blanks): Create 5-10 sentences with key missing words. DO NOT include answers here.
    3. সংক্ষিপ্ত প্রশ্ন (Short Answer Questions): Focus on 5-10 core concepts and definitions from the chapter.
    4. রচনামূলক/সৃজনশীল প্রশ্ন (Creative Questions): Design 2-3 scenario-based questions. 
       **CRITICAL FORMATTING**:
       First, provide the stimulus/passage.
       Then, provide the sub-questions. Each sub-question MUST be on a new line.
       ${creativeFormatRule}
       Example format:
       উদ্দীপক: (Stimulus text goes here...)
       
       ক) Question text?  ১
       খ) Question text?  ২
       গ) Question text?  ৩
       ঘ) Question text?  ৪
    5. উত্তরমালা (Answer Key): Provide ALL answers for ALL sections (MCQ, Fill in the blanks, Short, Creative) at the VERY END of the document in a dedicated Answer Key section. DO NOT include answers immediately after the questions or at the end of individual sections.
    CRITICAL DELIMITER: You MUST place the exact text "---ANSWER_KEY_START---" on a new line immediately before the "উত্তরমালা (Answer Key)" heading. This is required for our system to split the document.
    
    Image & Diagram Handling:
    - DO NOT create a separate section for "Image/Diagram-based questions".
    - Instead, you may use image references as the stimulus (উদ্দীপক) for ANY type of question (MCQ, Creative, Short, etc.).
    - When using an image reference, DO NOT use mermaid code blocks or complex ASCII art. Use a clear descriptive placeholder like: [Image: A diagram showing the process of photosynthesis] or [Image: A food chain showing Grass -> Grasshopper -> Frog].
    
    Dynamic Structure & Document Analysis Rules:
    - Customizable Format & Marks: Strictly follow the user's exact instructions for the test structure if provided. This includes specific types of questions, exact counts, and marks.
    - Multi-Chapter Combinations: If multiple chapters or topics are specified, distribute questions logically and evenly across them.
    - Document Extraction: If a document is provided, generate all questions STRICTLY based on the content of that document.
    - Internet Search & Real-World Grounding: You MUST use the Google Search tool to find actual test papers, guide book questions, and important questions from various schools and colleges for the specified topic. Ensure these questions exactly match the NCTB textbook syllabus. Incorporate these high-quality, realistic questions into your output.
    - Header: Include the provided Time and Total Marks at the top of the question paper.
    - Spacing: Ensure there is a blank line (double line break) between EVERY single question so they do not run together continuously.
    - Numbering: Restart the question numbering from 1 for EVERY new section. For example, if MCQ ends at 10, the first question of Fill in the Blanks MUST start at 1, not 11.
    
    Language Rules:
    ${languageRule}
    
    Behavioral Guidelines:
    - Synthesize your training data and search results regarding the specific NCTB chapter to formulate questions that are highly relevant, accurate, and intellectually stimulating.
    - Do not provide generic questions; tailor them specifically to the syllabus of that class and chapter.
    - Do not include introductory conversational filler. Output the question paper directly in Markdown format.
  `;

  const prompt = `Create a question paper with the following details:
    Class: ${classLevel}
    Subject: ${subject}
    Chapter/Topic: ${chapter}
    Time: ${time || "Not specified"}
    Total Marks: ${totalMarks || "Not specified"}
    ${customInstructions ? `Custom Structure/Instructions: ${customInstructions}` : ""}
    ${fileData ? "Note: Generate questions strictly based on the attached document content." : ""}
  `;

  try {
    const parts: any[] = [{ text: prompt }];
    if (fileData) {
      parts.push({
        inlineData: {
          data: fileData.data,
          mimeType: fileData.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Failed to generate questions.";
  } catch (error: any) {
    console.error("Error generating questions:", error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("You have exceeded your Gemini API quota. If you just created this key, you might be in a region (like the UK/EU) where the free tier is unavailable, or you have reached your limit. Please set up a billing account at https://aistudio.google.com/app/billing");
    }
    throw new Error(error?.message || "Failed to generate questions. Please check your API key and try again.");
  }
}
