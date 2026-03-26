import React, { useState, useEffect, useContext } from 'react';
import { ShieldAlert, Users, FileText, Loader2, Ban, Trash2, CheckCircle, X, Copy, Check, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { exportToWord } from '../lib/exportUtils';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { AuthContext } from '../App';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'documents'>('users');
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
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);

        const docsQuery = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
        const docsSnapshot = await getDocs(docsQuery);
        const docsData = docsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDocuments(docsData);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const handleBlockUser = async (id: string, isBlocked: boolean) => {
    try {
      await updateDoc(doc(db, 'users', id), { is_blocked: isBlocked });
      setUsers(users.map(u => u.id === id ? { ...u, is_blocked: isBlocked } : u));
    } catch (e) {
      console.error("Error blocking user:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div 
          onClick={() => setActiveTab('users')}
          className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border ${activeTab === 'users' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700'} p-6 flex items-center gap-4 cursor-pointer transition-all`}
        >
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/50 rounded-xl">
            <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</p>
          </div>
        </div>
        <div 
          onClick={() => setActiveTab('documents')}
          className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border ${activeTab === 'documents' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-700'} p-6 flex items-center gap-4 cursor-pointer transition-all`}
        >
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/50 rounded-xl">
            <FileText className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Documents</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{documents.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {activeTab === 'users' ? 'Manage Users' : 'All Generated Documents'}
          </h2>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {activeTab === 'users' ? (
            <>
              {users.map((u) => (
                <div key={u.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-md font-medium text-slate-900 dark:text-white">{u.username || u.displayName || u.email}</h3>
                      {u.role === 'admin' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs rounded-full font-medium">Admin</span>}
                      {u.is_blocked ? <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs rounded-full font-medium">Blocked</span> : null}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Daily Limit: {u.role === 'admin' ? 'Unlimited' : `${Math.max(0, 4 - (u.generation_count || 0))}/4 remaining`}
                    </p>
                  </div>
                  {u.role !== 'admin' && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleBlockUser(u.id, !u.is_blocked)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${u.is_blocked ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40' : 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40'}`}
                      >
                        {u.is_blocked ? <><CheckCircle className="w-4 h-4" /> Unblock</> : <><Ban className="w-4 h-4" /> Block</>}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {users.length === 0 && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">No users found.</div>
              )}
            </>
          ) : (
            <>
              {documents.map((doc) => (
                <div key={doc.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="text-md font-medium text-slate-900 dark:text-white">{doc.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">User ID: {doc.user_id} • Created: {new Date(doc.createdAt).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedDoc(doc)}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 transition-colors"
                  >
                    View
                  </button>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">No documents found.</div>
              )}
            </>
          )}
        </div>
      </div>

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
