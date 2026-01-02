import React, { useEffect, useState, useCallback } from 'react';
import { Globe, Trash2, ExternalLink, RefreshCw, Keyboard, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface HighlightFile {
  id: string;
  domain: string;
  filename: string;
  path: string;
  updatedAt: string;
}

interface WebHighlightsProps {
  vaultPath: string | null;
}

/**
 * WebHighlights component displays web clippings captured via the global hotkey.
 * Organized by domain, each domain has its own markdown file with highlights.
 */
export const WebHighlights: React.FC<WebHighlightsProps> = ({ vaultPath }) => {
  const [highlightFiles, setHighlightFiles] = useState<HighlightFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<HighlightFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hotkey, setHotkey] = useState<string>('Cmd+Shift+H');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [copiedHotkey, setCopiedHotkey] = useState(false);

  // Load highlight files list
  const loadHighlights = useCallback(async () => {
    if (!vaultPath) return;
    
    setLoading(true);
    try {
      const result = await window.appBridge?.listHighlights?.(vaultPath);
      if (result?.ok) {
        setHighlightFiles(result.highlights);
        // Auto-expand all domains initially
        setExpandedDomains(new Set(result.highlights.map(h => h.domain)));
      }
    } catch (error) {
      console.error('Failed to load highlights:', error);
    } finally {
      setLoading(false);
    }
  }, [vaultPath]);

  // Load hotkey info
  useEffect(() => {
    const getHotkey = async () => {
      const result = await window.appBridge?.getHighlightHotkey?.();
      if (result?.hotkey) {
        // Convert to user-friendly format
        const formatted = result.hotkey
          .replace('CommandOrControl', navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
          .replace('Shift', '⇧')
          .replace(/\+/g, ' + ');
        setHotkey(formatted);
      }
    };
    getHotkey();
  }, []);

  // Load highlights on mount and when vault changes
  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  // Listen for new highlights
  useEffect(() => {
    const cleanup = window.appBridge?.onHighlightAdded?.(() => {
      loadHighlights();
    });
    return () => cleanup?.();
  }, [loadHighlights]);

  // Load selected file content
  const handleSelectFile = async (file: HighlightFile) => {
    setSelectedFile(file);
    try {
      const result = await window.appBridge?.readHighlight?.(file.path);
      if (result?.ok) {
        setContent(result.content);
      }
    } catch (error) {
      console.error('Failed to read highlight file:', error);
      setContent('');
    }
  };

  // Delete a highlight file
  const handleDelete = async (file: HighlightFile) => {
    if (!confirm(`Delete all highlights from ${file.domain}?`)) return;
    
    try {
      const result = await window.appBridge?.deleteHighlight?.(file.path);
      if (result?.ok) {
        setHighlightFiles(files => files.filter(f => f.id !== file.id));
        if (selectedFile?.id === file.id) {
          setSelectedFile(null);
          setContent('');
        }
      }
    } catch (error) {
      console.error('Failed to delete highlight file:', error);
    }
  };

  // Toggle domain expansion
  const toggleDomain = (domain: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  // Copy hotkey to clipboard
  const copyHotkey = () => {
    navigator.clipboard.writeText(hotkey);
    setCopiedHotkey(true);
    setTimeout(() => setCopiedHotkey(false), 2000);
  };

  if (!vaultPath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-warm-gray">
        <div className="text-center p-8">
          <Globe className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Web Highlights</h2>
          <p className="text-slate-500">Open a vault to view your web highlights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-warm-gray overflow-hidden">
      {/* Left Panel - Highlight Files List */}
      <div className="w-72 border-r border-slate-200 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Globe size={20} className="text-rose-500" />
              Web Highlights
            </h2>
            <button
              onClick={loadHighlights}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Hotkey Info */}
          <div 
            className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg p-2 cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={copyHotkey}
            title="Click to copy"
          >
            <Keyboard size={14} className="text-slate-500" />
            <span className="text-slate-600">Capture:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-mono text-xs shadow-sm">
              {hotkey}
            </kbd>
            {copiedHotkey ? (
              <Check size={12} className="text-emerald-500 ml-auto" />
            ) : (
              <Copy size={12} className="text-slate-400 ml-auto" />
            )}
          </div>
        </div>

        {/* Instructions when empty */}
        {highlightFiles.length === 0 && !loading && (
          <div className="p-4 text-center">
            <p className="text-sm text-slate-500 mb-3">No highlights yet</p>
            <div className="text-xs text-slate-400 space-y-2">
              <p>1. Select text in your browser</p>
              <p>2. Press <kbd className="px-1 py-0.5 bg-slate-100 rounded">{hotkey}</kbd> to save</p>
            </div>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {highlightFiles.map((file) => (
            <div key={file.id} className="border-b border-slate-100 last:border-b-0">
              <button
                onClick={() => toggleDomain(file.domain)}
                className="w-full px-4 py-2 flex items-center gap-2 hover:bg-slate-50 transition-colors text-left"
              >
                {expandedDomains.has(file.domain) ? (
                  <ChevronDown size={14} className="text-slate-400" />
                ) : (
                  <ChevronRight size={14} className="text-slate-400" />
                )}
                <Globe size={14} className="text-slate-500" />
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">
                  {file.domain}
                </span>
              </button>
              
              {expandedDomains.has(file.domain) && (
                <div className="pl-8 pb-2">
                  <button
                    onClick={() => handleSelectFile(file)}
                    className={`w-full px-3 py-1.5 text-left text-xs rounded-md transition-colors flex items-center gap-2 ${
                      selectedFile?.id === file.id
                        ? 'bg-rose-light text-rose-dark'
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="flex-1">View highlights</span>
                    <span className="text-slate-400">
                      {new Date(file.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  
                  <div className="flex gap-1 mt-1 px-3">
                    <button
                      onClick={() => handleDelete(file)}
                      className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete all highlights from this domain"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Content View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFile ? (
          <>
            {/* Content Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{selectedFile.domain}</h3>
                <p className="text-xs text-slate-500">
                  Last updated: {new Date(selectedFile.updatedAt).toLocaleString()}
                </p>
              </div>
              <a
                href={`https://${selectedFile.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 transition-colors"
              >
                <ExternalLink size={14} />
                Visit site
              </a>
            </div>

            {/* Markdown Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <article className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-rose-600 prose-blockquote:border-l-rose-400 prose-blockquote:bg-rose-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </article>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <Globe className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Capture Web Content
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Save highlights from any website directly to your vault.
                Each domain gets its own file for easy organization.
              </p>
              
              <div className="bg-slate-50 rounded-xl p-6 text-left space-y-4">
                <h4 className="font-medium text-slate-700 text-sm">How to use:</h4>
                <ol className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xs font-semibold">1</span>
                    <span>Select text in any browser (Chrome, Arc, Safari, Edge, Brave, Firefox, etc.)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xs font-semibold">2</span>
                    <span>
                      Copy with <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono">Cmd+C</kbd> then press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono">{hotkey}</kbd>
                    </span>
                  </li>
                </ol>
                
                <div className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <p>💡 Magma detects the browser URL and organizes highlights by domain.</p>
                  <p>✨ <strong>Pro tip:</strong> Grant Accessibility permissions to skip the copy step!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebHighlights;

