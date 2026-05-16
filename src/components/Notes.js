import React, { useState, useEffect, useRef } from 'react';

// ============================================================
// SIMPLE MARKDOWN RENDERER
// Converts basic markdown to HTML for preview mode
// ============================================================
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    // Checkboxes
    .replace(/^- \[x\] (.+)$/gm, '<li class="note-check checked"><span class="note-checkbox">✓</span> $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="note-check"><span class="note-checkbox">○</span> $1</li>')
    // Unordered list
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr />')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />');

  return `<p>${html}</p>`;
}

// ============================================================
// NOTES COMPONENT
// ============================================================
function Notes() {

  // ---- All notes stored as array ----
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('torchlight-notes');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // ---- Currently selected note ID ----
  const [activeId, setActiveId] = useState(null);

  // ---- Edit or preview mode ----
  const [mode, setMode] = useState('edit'); // 'edit' | 'preview'

  // ---- Search query ----
  const [search, setSearch] = useState('');

  // ---- Hidden file input ref for import ----
  const fileInputRef = useRef(null);


  // ============================================================
  // PERSIST TO LOCALSTORAGE ON CHANGE
  // ============================================================
  useEffect(() => {
    localStorage.setItem('torchlight-notes', JSON.stringify(notes));
  }, [notes]);


  // ============================================================
  // HELPERS
  // ============================================================
  const activeNote = notes.find(n => n.id === activeId) || null;

  const filteredNotes = notes.filter(n => {
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    );
  });


  // ============================================================
  // CREATE NEW NOTE
  // ============================================================
  const createNote = () => {
    const newNote = {
      id: Date.now(),
      title: 'Untitled Note',
      content: '',
      updatedAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveId(newNote.id);
    setMode('edit');
  };


  // ============================================================
  // UPDATE ACTIVE NOTE CONTENT OR TITLE
  // ============================================================
  const updateNote = (field, value) => {
    setNotes(prev => prev.map(n =>
      n.id === activeId
        ? { ...n, [field]: value, updatedAt: new Date().toISOString() }
        : n
    ));
  };


  // ============================================================
  // DELETE NOTE
  // ============================================================
  const deleteNote = (id) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeId === id) setActiveId(null);
  };


  // ============================================================
  // EXPORT SINGLE NOTE AS .md
  // ============================================================
  const exportNote = (note) => {
    const blob = new Blob([note.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };


  // ============================================================
  // EXPORT ALL NOTES AS SEPARATE .md FILES
  // ============================================================
  const exportAll = () => {
    notes.forEach((note, i) => {
      setTimeout(() => exportNote(note), i * 300);
    });
  };


  // ============================================================
  // IMPORT .md FILE
  // ============================================================
  const importFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newNote = {
        id: Date.now(),
        title: file.name.replace(/\.md$/, ''),
        content: ev.target.result,
        updatedAt: new Date().toISOString(),
      };
      setNotes(prev => [newNote, ...prev]);
      setActiveId(newNote.id);
      setMode('edit');
    };
    reader.readAsText(file);
    // Reset input so same file can be imported again
    e.target.value = '';
  };


  // ============================================================
  // FORMAT DATE
  // ============================================================
  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };


  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="notes-page">

      {/* ---- LEFT SIDEBAR ---- */}
      <div className="notes-sidebar">

        {/* Sidebar header */}
        <div className="notes-sidebar-header">
          <span className="notes-sidebar-title">📝 Session Vault</span>
          <button className="notes-new-btn" onClick={createNote} title="New note">+</button>
        </div>

        {/* Search bar */}
        <div className="notes-search-wrap">
          <input
            className="notes-search"
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Import button */}
        <div className="notes-import-wrap">
          <button
            className="notes-import-btn"
            onClick={() => fileInputRef.current.click()}
          >
            ⬆ Import .md
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown"
            style={{ display: 'none' }}
            onChange={importFile}
          />
        </div>

        {/* Note list */}
        <div className="notes-list">
          {filteredNotes.length === 0 && (
            <div className="notes-empty-list">
              {search ? 'No results.' : 'No notes yet.\nClick + to create one.'}
            </div>
          )}
          {filteredNotes.map(note => (
            <div
              key={note.id}
              className={`notes-list-item ${note.id === activeId ? 'active' : ''}`}
              onClick={() => setActiveId(note.id)}
            >
              <div className="notes-list-item-top">
                <span className="notes-list-title">{note.title || 'Untitled'}</span>
                <button
                  className="notes-delete-btn"
                  onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                  title="Delete note"
                >✕</button>
              </div>
              <div className="notes-list-preview">
                {note.content
                  ? note.content.replace(/[#*>\-[\]]/g, '').slice(0, 60) + '...'
                  : 'Empty note'}
              </div>
              <div className="notes-list-date">{formatDate(note.updatedAt)}</div>
            </div>
          ))}
        </div>

        {/* Export all */}
        {notes.length > 1 && (
          <div className="notes-export-all-wrap">
            <button className="notes-export-all-btn" onClick={exportAll}>
              ⬇ Export All ({notes.length})
            </button>
          </div>
        )}
      </div>

      {/* ---- MAIN EDITOR AREA ---- */}
      <div className="notes-main">
        {activeNote ? (
          <>
            {/* Editor top bar */}
            <div className="notes-editor-bar">

              {/* Title input */}
              <input
                className="notes-title-input"
                type="text"
                value={activeNote.title}
                onChange={e => updateNote('title', e.target.value)}
                placeholder="Note title..."
              />

              {/* Mode toggle */}
              <div className="notes-mode-toggle">
                <button
                  className={`notes-mode-btn ${mode === 'edit' ? 'active' : ''}`}
                  onClick={() => setMode('edit')}
                >✏ Edit</button>
                <button
                  className={`notes-mode-btn ${mode === 'preview' ? 'active' : ''}`}
                  onClick={() => setMode('preview')}
                >👁 Preview</button>
              </div>

              {/* Export button */}
              <button
                className="notes-export-btn"
                onClick={() => exportNote(activeNote)}
              >⬇ Export .md</button>
            </div>

            {/* Editor / Preview */}
            {mode === 'edit' ? (
              <textarea
                className="notes-editor"
                value={activeNote.content}
                onChange={e => updateNote('content', e.target.value)}
                placeholder={`# Note Title\n\nStart writing...\n\nSupports **bold**, *italic*, # headings, - lists, > blockquotes, - [ ] checkboxes`}
                spellCheck={true}
              />
            ) : (
              <div
                className="notes-preview"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(activeNote.content) }}
              />
            )}

            {/* Autosave indicator */}
            <div className="notes-autosave">
              ● Autosaved · {formatDate(activeNote.updatedAt)}
            </div>
          </>
        ) : (
          /* No note selected */
          <div className="notes-no-selection">
            <div className="notes-no-selection-icon">📜</div>
            <div className="notes-no-selection-text">Select a note or create a new one</div>
            <button className="notes-new-btn-large" onClick={createNote}>+ New Note</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notes;
