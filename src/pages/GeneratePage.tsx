import React, { useState, useRef, useContext } from 'react';
import { BookOpen, GraduationCap, FileText, Send, Copy, Check, Loader2, Upload, File, Download, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { AuthContext } from '../App';
import { exportToWord } from '../lib/exportUtils';
import { generateQuestions } from '../services/geminiService';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function GeneratePage() {
  const { user, setUser } = useContext(AuthContext);
  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [time, setTime] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState('');
  const [copiedQ, setCopiedQ] = useState(false);
  const [copiedA, setCopiedA] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGenerate = async () => {
    if (!classLevel || !subject || !chapter) {
      setError('Please fill in Class, Subject, and Chapter.');
      return;
    }

    if (user.is_blocked) {
      setError('Your account has been blocked. Please contact support.');
      return;
    }

    if (user.role === 'user' && (user.generation_count || 0) >= 4) {
      setError('You have reached your daily limit of 4 generations.');
      return;
    }

    setLoading(true);
    setError('');
    setQuestions('');

    try {
      let fileData = undefined;
      if (file) {
        const base64Data = await fileToBase64(file);
        fileData = { data: base64Data, mimeType: file.type };
      }

      // Call Gemini directly from frontend
      const generatedContent = await generateQuestions(
        classLevel,
        subject,
        chapter,
        time,
        totalMarks,
        customInstructions,
        fileData
      );

      setQuestions(generatedContent);
      
      // Save document to Firestore
      const title = `${subject} - ${chapter} (${classLevel})`;
      await addDoc(collection(db, 'documents'), {
        user_id: user.uid,
        title,
        content: generatedContent,
        createdAt: new Date().toISOString()
      });

      // Update user generation count in Firestore
      if (user.role === 'user') {
        const newCount = (user.generation_count || 0) + 1;
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { generation_count: newCount });
        setUser({ ...user, generation_count: newCount });
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const parts = questions.split('---ANSWER_KEY_START---');
  const questionsPart = parts[0] || '';
  const answersPart = parts.length > 1 ? parts.slice(1).join('---ANSWER_KEY_START---') : '';

  const copyToClipboard = (text: string, type: 'q' | 'a') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'q') {
        setCopiedQ(true);
        setTimeout(() => setCopiedQ(false), 2000);
      } else {
        setCopiedA(true);
        setTimeout(() => setCopiedA(false), 2000);
      }
    });
  };

  const downloadAsWord = (text: string, suffix: string) => {
    exportToWord(text, `${subject}_${classLevel}_${suffix}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          Generate Questions
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Create high-quality, customized question papers instantly using AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="relative">
                <input
                  type="text"
                  id="classLevel"
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="peer w-full px-4 pt-6 pb-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-transparent"
                  placeholder="Class / Grade"
                />
                <label htmlFor="classLevel" className="absolute left-4 top-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> Class / Grade
                </label>
              </div>

              <div className="relative">
                <input
                  type="text"
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="peer w-full px-4 pt-6 pb-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-transparent"
                  placeholder="Subject"
                />
                <label htmlFor="subject" className="absolute left-4 top-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Subject
                </label>
              </div>

              <div className="relative">
                <input
                  type="text"
                  id="chapter"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="peer w-full px-4 pt-6 pb-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-transparent"
                  placeholder="Chapter / Topic"
                />
                <label htmlFor="chapter" className="absolute left-4 top-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Chapter / Topic
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    id="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="peer w-full px-4 pt-6 pb-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-transparent"
                    placeholder="Time"
                  />
                  <label htmlFor="time" className="absolute left-4 top-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400">
                    Time (Optional)
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    id="totalMarks"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="peer w-full px-4 pt-6 pb-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-transparent"
                    placeholder="Marks"
                  />
                  <label htmlFor="totalMarks" className="absolute left-4 top-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400">
                    Marks (Optional)
                  </label>
                </div>
              </div>

              <div className="relative">
                <textarea
                  id="customInstructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={3}
                  className="peer w-full px-4 pt-6 pb-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder-transparent resize-none"
                  placeholder="Custom Instructions"
                />
                <label htmlFor="customInstructions" className="absolute left-4 top-2 text-xs font-medium text-slate-500 dark:text-slate-400 transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-xs peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400">
                  Custom Instructions (Optional)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reference Document (Optional)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group"
                >
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                    <Upload className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 text-center">
                    {file ? file.name : 'Click to upload PDF or Image'}
                  </span>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,image/*"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || (user.role === 'user' && user.generation_count >= 4)}
              className="w-full py-4 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Generate Questions
                </>
              )}
            </button>
            
            {user.role === 'user' && user.generation_count >= 4 && (
              <p className="text-xs text-center text-red-500 mt-2">Daily limit reached. Try again tomorrow.</p>
            )}
          </div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 min-h-[600px] flex flex-col relative overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-8 w-full">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3 mx-auto mb-8 shimmer-bg"></div>
                <div className="space-y-6">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0 shimmer-bg"></div>
                      <div className="space-y-3 flex-1">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full shimmer-bg"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6 shimmer-bg"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : questions ? (
              <div className="flex-1 flex flex-col animate-fade-in-up">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Questions</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(questionsPart, 'q')}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                    >
                      {copiedQ ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      {copiedQ ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => downloadAsWord(questionsPart, 'Questions')}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download Word
                    </button>
                  </div>
                </div>
                <div className="p-8 overflow-auto flex-1 bg-[#FAFAFA] dark:bg-slate-900">
                  <div className="markdown-body max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex, rehypeRaw]}
                    >
                      {questionsPart}
                    </ReactMarkdown>
                  </div>
                  
                  {answersPart && (
                    <div className="mt-16 pt-8 border-t-2 border-dashed border-slate-200 dark:border-slate-800">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-2">
                          <Check className="w-6 h-6" />
                          Answer Key
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(answersPart, 'a')}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                          >
                            {copiedA ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            {copiedA ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            onClick={() => downloadAsWord(answersPart, 'Answers')}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm"
                          >
                            <Download className="w-4 h-4" />
                            Download Word
                          </button>
                        </div>
                      </div>
                      <div className="markdown-body max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex, rehypeRaw]}
                        >
                          {answersPart}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 text-center space-y-4">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-xl font-medium text-slate-500 dark:text-slate-400">Ready to generate</p>
                <p className="text-sm max-w-sm text-slate-400 dark:text-slate-500">Fill out the form on the left and click generate to create your custom question paper.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
