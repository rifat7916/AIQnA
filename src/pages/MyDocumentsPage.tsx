import React, { useState, useEffect, useContext } from 'react';
import { FileText, Loader2, Calendar, X, Copy, Check, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { exportToWord } from '../lib/exportUtils';
import { AuthContext } from '../App';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function MyDocumentsPage() {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [copiedQuestions, setCopiedQuestions] = useState(false);
  const [copiedAnswers, setCopiedAnswers] = useState(false);

  const handleCopy = (content: string, isAnswers: boolean) => {
    navigator.clipboard.writeText(content).then(() => {
      if (isAnswers) {
        setCopiedAnswers(true);
        setTimeout(() => setCopiedAnswers(false), 2000);
      } else {
        setCopiedQuestions(true);
        setTimeout(() => setCopiedQuestions(false), 2000);
      }
    });
  };

  const handleDownload = (doc: any, content: string, isAnswers: boolean) => {
    const title = `${doc.title || 'Document'}_${isAnswers ? 'Answers' : 'Questions'}`;
    exportToWord(content, title);
  };

  useEffect(() => {
    if (!user) return;

    const fetchDocuments = async () => {
      try {
        const q = query(
          collection(db, 'documents'),
          where('user_id', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDocuments(docs);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <FileText className="w-6 h-6 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">My Documents</h1>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No documents yet</h3>
          <p className="text-slate-500 dark:text-slate-400">Generate some questions to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              onClick={() => setSelectedDoc(doc)}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">{doc.title}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4" />
                {new Date(doc.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDoc && (() => {
        const parts = selectedDoc.content.split('---ANSWER_KEY_START---');
        const questionsPart = parts[0] || '';
        const answersPart = parts.length > 1 ? parts.slice(1).join('---ANSWER_KEY_START---') : '';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white truncate pr-4">{selectedDoc.title}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-[#FAFAFA] dark:bg-slate-900">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Question Paper</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(questionsPart, false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                      {copiedQuestions ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      <span className="hidden sm:inline">{copiedQuestions ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => handleDownload(selectedDoc, questionsPart, false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </div>
                </div>
                <div className="markdown-body max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeRaw]}
                  >
                    {questionsPart}
                  </ReactMarkdown>
                </div>

                {answersPart && (
                  <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-500 flex items-center gap-2">
                        <Check className="w-6 h-6" />
                        Answer Key
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(answersPart, true)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        >
                          {copiedAnswers ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          <span className="hidden sm:inline">{copiedAnswers ? 'Copied!' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={() => handleDownload(selectedDoc, answersPart, true)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">Download</span>
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
          </div>
        );
      })()}
    </div>
  );
}
