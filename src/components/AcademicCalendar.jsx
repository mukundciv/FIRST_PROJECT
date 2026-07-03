import React, { useState, useRef, useEffect } from 'react';

// ── Dummy seed events ──────────────────────────────────────────────────────
const SEED_EVENTS = [];

function formatDate(ds) {
  const d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── AcademicCalendar Component ────────────────────────────────────────────
export default function AcademicCalendar() {

  // Dev role toggle
  const [userRole, setUserRole] = useState('student');

  // Session configuration (admin only)
  const [term, setTerm]                   = useState('Winter');
  const [year, setYear]                   = useState('2026');
  const [activeSession, setActiveSession] = useState('Winter / 2026');
  const [uploading, setUploading]         = useState(false);
  const [isDragging, setIsDragging]       = useState(false);
  const [droppedFile, setDroppedFile]     = useState(null);
  const fileInputRef = useRef(null);

  // Viewer controls
  const [zoom, setZoom] = useState(1);
  const viewerRef = useRef(null);
  const scrollRef = useRef(null);
  const iframeRef = useRef(null);
  const panRef    = useRef({ isDragging: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  // Page-wide drag-to-scroll when zoomed in
  useEffect(() => {
    let isPageDragging = false;
    let startX = 0, startY = 0;
    let startScrollLeft = 0, startScrollTop = 0;

    const handlePageMouseDown = e => {
      const target = e.target;

      // Don't drag if click originates inside calendar viewer container (let calendar local drag handle it)
      if (viewerRef.current && viewerRef.current.contains(target)) {
        return;
      }

      // Check if target is inside the modal or popup
      const modalOverlay = document.querySelector('[style*="overlay"]');
      if (modalOverlay && modalOverlay.contains(target)) {
        return;
      }

      // Don't drag on interactive elements
      const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'OPTION', 'IFRAME', 'LABEL'];
      if (interactiveTags.includes(target.tagName)) {
        return;
      }

      // Don't drag if target cursor is pointer (star bookmark, close icon, list items, etc.)
      const isPointer = window.getComputedStyle(target).cursor === 'pointer';
      if (isPointer) {
        return;
      }

      isPageDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      startScrollTop = window.pageYOffset || document.documentElement.scrollTop;

      document.body.style.cursor = 'grabbing';
      if (iframeRef.current) {
        iframeRef.current.style.pointerEvents = 'none';
      }
      e.preventDefault();
    };

    const handlePageMouseMove = e => {
      if (!isPageDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      window.scrollTo(startScrollLeft - dx, startScrollTop - dy);
    };

    const handlePageMouseUp = () => {
      if (!isPageDragging) return;
      isPageDragging = false;
      document.body.style.cursor = '';
      if (iframeRef.current) {
        iframeRef.current.style.pointerEvents = 'auto';
      }
    };

    window.addEventListener('mousedown', handlePageMouseDown);
    window.addEventListener('mousemove', handlePageMouseMove);
    window.addEventListener('mouseup', handlePageMouseUp);

    return () => {
      window.removeEventListener('mousedown', handlePageMouseDown);
      window.removeEventListener('mousemove', handlePageMouseMove);
      window.removeEventListener('mouseup', handlePageMouseUp);
      document.body.style.cursor = '';
    };
  }, []);

  const calendarMouseMoveRef = useRef();
  const calendarMouseUpRef = useRef();

  useEffect(() => {
    calendarMouseMoveRef.current = e => {
      if (!panRef.current.isDragging || !scrollRef.current) return;
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      scrollRef.current.scrollLeft = panRef.current.scrollLeft - dx;
      scrollRef.current.scrollTop = panRef.current.scrollTop - dy;
    };
    calendarMouseUpRef.current = () => {
      if (!scrollRef.current) return;
      panRef.current.isDragging = false;
      scrollRef.current.style.cursor = zoom > 1 ? 'grab' : 'default';
      if (iframeRef.current) {
        iframeRef.current.style.pointerEvents = 'auto';
      }
      window.removeEventListener('mousemove', onCalendarMouseMove);
      window.removeEventListener('mouseup', onCalendarMouseUp);
    };
  });

  const onCalendarMouseMove = e => calendarMouseMoveRef.current(e);
  const onCalendarMouseUp = () => calendarMouseUpRef.current();

  const handleMouseDown = e => {
    if (!scrollRef.current) return;
    panRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop
    };
    scrollRef.current.style.cursor = 'grabbing';
    if (iframeRef.current) {
      iframeRef.current.style.pointerEvents = 'none';
    }
    window.addEventListener('mousemove', onCalendarMouseMove);
    window.addEventListener('mouseup', onCalendarMouseUp);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onCalendarMouseMove);
      window.removeEventListener('mouseup', onCalendarMouseUp);
    };
  }, []);

  // Event planner state
  const [events, setEvents]       = useState(SEED_EVENTS);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ name: '', date: '', description: '' });
  const [deletingId, setDeletingId] = useState(null);

  const [publishedFile,  setPublishedFile]  = useState(null);
  const [documentUrl,    setDocumentUrl]    = useState("https://drive.google.com/file/d/MOCK_FILE_ID/preview");

  useEffect(() => {
    if (publishedFile) {
      const url = URL.createObjectURL(publishedFile);
      setDocumentUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setDocumentUrl("https://drive.google.com/file/d/MOCK_FILE_ID/preview");
    }
  }, [publishedFile]);

  // Always start in student view on mount
  useEffect(() => {
    setUserRole('student');
  }, []);

  // ── Admin upload ──────────────────────────────────────────────────────────
  const handleUpload = () => {
    setUploading(true);
    setTimeout(() => {
      setActiveSession(`${term} / ${year}`);
      if (droppedFile) {
        setPublishedFile(droppedFile);
        setDroppedFile(null);
      }
      setUploading(false);
    }, 2500);
  };

  const handleDragOver  = e => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = ()  => setIsDragging(false);
  const handleDrop = e => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type === 'application/pdf' || f.type.startsWith('image/'))) setDroppedFile(f);
  };

  // ── Viewer helpers ────────────────────────────────────────────────────────
  const zoomIn          = () => setZoom(z => Math.min(+(z + 0.15).toFixed(2), 2));
  const zoomOut         = () => setZoom(z => Math.max(+(z - 0.15).toFixed(2), 0.5));
  const handleFullscreen = () => viewerRef.current?.requestFullscreen?.();

  // ── Event planner helpers ─────────────────────────────────────────────────
  const handleAddEvent = e => {
    e.preventDefault();
    if (!form.name || !form.date) return;
    setEvents(prev => [{ id: Date.now(), name: form.name, date: form.date, description: form.description, bookmarked: false }, ...prev]);
    setForm({ name: '', date: '', description: '' });
    setShowModal(false);
  };

  const handleBookmark = id => {
    setEvents(prev => {
      const updated = prev.map(e => e.id === id ? { ...e, bookmarked: !e.bookmarked } : e);
      return [...updated.filter(e => e.bookmarked), ...updated.filter(e => !e.bookmarked)];
    });
  };

  const handleDelete = id => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setDeletingId(null);
  };

  // ── Shared style helpers ──────────────────────────────────────────────────
  const inp = 'w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none placeholder-slate-600 focus:border-indigo-500/60 transition-colors';
  const sel = `${inp} cursor-pointer`;
  const lbl = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6 font-sans cursor-grab">

      {/* ── 1. Dev Mode Banner ──────────────────────────────────────────── */}
      <div className="flex items-center flex-wrap gap-3 px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/5 backdrop-blur-sm">
        <span className="text-amber-400 text-xs font-black tracking-widest uppercase">🛠️ Dev Mode — Active Role:</span>
        <div className="flex gap-1 ml-auto">
          {[['student', 'Student View'], ['admin', 'Admin View']].map(([role, label]) => (
            <button key={role} onClick={() => setUserRole(role)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200
                ${userRole === role
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-50">VNIT Academic Calendar</h1>
          <p className="text-xs text-slate-500 mt-1 tracking-wide">Official schedule &amp; personal event planner</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-sm self-start mt-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0"/>
          <span className="text-xs font-semibold text-indigo-300 tracking-wider whitespace-nowrap">
            Active Session: {activeSession}
          </span>
        </div>
      </div>

      {/* ── 3. Admin Control Panel ──────────────────────────────────────── */}
      {userRole === 'admin' && (
        <div className="rounded-2xl border border-amber-500/25 bg-slate-900/80 backdrop-blur-xl p-6 space-y-5 shadow-xl shadow-amber-500/5">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⚙️</span>
            <span className="text-xs font-black uppercase tracking-widest text-amber-400/90">Admin Control Panel</span>
            <div className="ml-auto px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">ADMIN</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Session Term</label>
              <select value={term} onChange={e => setTerm(e.target.value)} className={sel}>
                {['Summer', 'Winter'].map(t => (
                  <option key={t} value={t} className="bg-slate-900">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Academic Year</label>
              <select value={year} onChange={e => setYear(e.target.value)} className={sel}>
                {['2024', '2025', '2026', '2027', '2028'].map(y => (
                  <option key={y} value={y} className="bg-slate-900">{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drag-Drop Upload Zone */}
          <div
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer select-none transition-all duration-300 ${
              isDragging  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
              : droppedFile ? 'border-green-500/70 bg-green-500/5'
              : 'border-slate-700/60 bg-slate-800/20 hover:border-indigo-500/50 hover:bg-indigo-500/5'
            }`}>
            <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
              onChange={e => setDroppedFile(e.target.files?.[0] ?? null)} />
            {droppedFile ? (
              <div className="space-y-2">
                <div className="text-3xl text-green-400">✓</div>
                <p className="text-green-400 text-sm font-bold">{droppedFile.name}</p>
                <p className="text-slate-500 text-xs">File ready — click Upload to publish</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-4xl opacity-40">📄</div>
                <div>
                  <p className="text-slate-300 text-sm font-semibold">Drop PDF or image here</p>
                  <p className="text-slate-600 text-xs mt-1">or click to browse — accepts .pdf, .jpg, .png</p>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleUpload} disabled={uploading}
            className={`w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2.5 ${
              uploading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400 hover:scale-[1.01] shadow-lg shadow-amber-500/25 active:scale-[0.99]'
            }`}>
            {uploading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin"/>
                Publishing Calendar…
              </>
            ) : '⬆️  Upload New Calendar'}
          </button>
        </div>
      )}

      {/* ── 4. Calendar Canvas ──────────────────────────────────────────── */}
      <div className="space-y-2">
        {userRole === 'admin' && (
          <div className="flex items-center gap-2 pb-1">
            <span className="text-amber-400">📌</span>
            <span className="text-xs font-black uppercase tracking-widest text-amber-400/80">
              Live Preview of Currently Active Document Below
            </span>
          </div>
        )}

        {/* ── Controls bar — sits ABOVE the container, never inside it ── */}
        <div className="flex items-center justify-between py-2">
          {/* Left: Fullscreen */}
          <button
            onClick={handleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/70 text-slate-300 text-xs font-semibold hover:text-white hover:border-slate-600 hover:bg-slate-700 transition-all"
          >
            ⛶&nbsp; Fullscreen
          </button>

          {/* Right: Zoom controls */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700/70 rounded-lg overflow-hidden">
            <button onClick={zoomOut} className="px-4 py-1.5 text-slate-300 font-bold text-lg leading-none hover:bg-slate-700 hover:text-white transition-colors">−</button>
            <span className="px-3 text-xs text-slate-400 font-mono border-x border-slate-700/60 min-w-[3.5rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={zoomIn}  className="px-4 py-1.5 text-slate-300 font-bold text-lg leading-none hover:bg-slate-700 hover:text-white transition-colors">+</button>
          </div>
        </div>

        {/* ── Main glassmorphic calendar frame — NO buttons inside ── */}
        <div
          ref={viewerRef}
          className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl"
          style={{ height: '680px' }}
        >
          {/* Scrollable / drag-to-pan wrapper */}
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            style={{
              width: '100%',
              height: '100%',
              overflow: zoom > 1 ? 'auto' : 'hidden',
              cursor: zoom > 1 ? 'grab' : 'default',
              userSelect: 'none',
            }}
          >
            {/* Drag-capture overlay over iframe when zoomed */}
            {zoom > 1 && (
              <div style={{ 
                position: 'absolute', 
                top: 0,
                left: 0,
                width: `${100 * zoom}%`,
                height: `${680 * zoom}px`,
                zIndex: 10, 
                background: 'transparent' 
              }} />
            )}

            {/* Scale the absolute sizing of the <iframe> or <img> layout frame itself directly */}
            {publishedFile && publishedFile.type.startsWith('image/') ? (
              <img 
                ref={iframeRef}
                src={documentUrl}
                alt="VNIT Academic Calendar"
                style={{ 
                  display: 'block', 
                  width: `${100 * zoom}%`, 
                  height: 'auto', 
                  minHeight: `${680 * zoom}px`, 
                  objectFit: 'contain',
                  transition: 'width 0.15s ease' 
                }}
              />
            ) : (
              <iframe 
                ref={iframeRef}
                src={documentUrl}
                title="VNIT Academic Calendar Document" 
                style={{ 
                  display: 'block', 
                  border: 'none', 
                  width: `${100 * zoom}%`, 
                  height: `${680 * zoom}px`, 
                  transition: 'width 0.15s ease, height 0.15s ease' 
                }}
              />
            )}
          </div>
        </div>

        {/* ── Download PDF — sits BELOW the container, never inside it ── */}
        <div className="flex justify-start pt-1">
          <a
            href={documentUrl}
            download={publishedFile ? publishedFile.name : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/90 border border-slate-700/70 text-slate-300 text-xs font-semibold hover:text-white hover:bg-slate-700 hover:border-slate-600 transition-all"
          >
            ⬇&nbsp; Download {publishedFile ? 'Calendar' : 'PDF'}
          </a>
        </div>
      </div>

      {/* ── 5. Personal Milestone & Event Feed ──────────────────────────── */}
      <div className="space-y-4 pb-8">
        {/* Section header */}
        <div className="flex items-center gap-3 pt-2">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <span className="text-indigo-400">📌</span> Personal Milestone &amp; Event Feed
          </h2>
          {events.length > 0 && (
            <div className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold">
              {events.length}
            </div>
          )}
        </div>

        {/* Add Event button — below section header */}
        <div className="flex justify-start">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 border border-indigo-500/60 text-white text-xs font-bold hover:bg-indigo-500 hover:scale-[1.02] transition-all shadow-lg shadow-indigo-500/25 active:scale-100"
          >
            + Add Event
          </button>
        </div>

        {/* Event list */}
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-14 text-center space-y-3">
            <div className="text-4xl opacity-40">🗓️</div>
            <p className="text-slate-500 text-sm">No events yet. Click <strong className="text-indigo-400">+ Add Event</strong> to start building your timeline.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <div
                key={ev.id}
                className={`group relative rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 ${
                  ev.bookmarked
                    ? 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_24px_rgba(245,158,11,0.12)]'
                    : 'border-slate-800/60 bg-slate-900/50 hover:border-slate-700/60 hover:bg-slate-900/70'
                }`}
              >

                {/* ── Two-step delete confirmation ── */}
                {deletingId === ev.id ? (
                  /* Confirmation state */
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900 border border-red-500/40 rounded-xl px-3 py-2 shadow-xl shadow-red-900/20 backdrop-blur-md">
                    <span className="text-[11px] font-bold text-red-400 mr-1">Are you sure?</span>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-black hover:bg-red-500 transition-colors"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 text-[11px] font-bold hover:bg-slate-600 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  /* Normal delete (✕) button */
                  <button
                    onClick={() => setDeletingId(ev.id)}
                    className="absolute top-3.5 right-3.5 z-10 w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.10] text-slate-400 hover:text-red-400 hover:bg-red-500/15 hover:border-red-500/30 transition-all text-xs font-bold"
                  >
                    ✕
                  </button>
                )}

                <div className="flex items-start gap-4 pr-10">
                  {/* Bookmark star */}
                  <button
                    onClick={() => handleBookmark(ev.id)}
                    className={`w-9 h-9 rounded-full border flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300 ${
                      ev.bookmarked
                        ? 'bg-amber-500/12 border-amber-500/40 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] scale-105'
                        : 'bg-white/[0.03] border-white/[0.08] text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] hover:border-white/[0.2]'
                    }`}
                  >
                    ★
                  </button>

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className={`font-bold text-sm tracking-tight ${ev.bookmarked ? 'text-amber-100' : 'text-slate-100'}`}>
                        {ev.name}
                      </h3>
                      {ev.bookmarked && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                          Priority
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-1 font-mono ${ev.bookmarked ? 'text-amber-400/70' : 'text-indigo-400/80'}`}>
                      📅 {formatDate(ev.date)}
                    </p>
                    {ev.description && (
                      <p className="text-slate-500 text-xs mt-2 leading-relaxed">{ev.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 6. Add Event Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="w-full max-w-md bg-slate-900/95 border border-slate-700/60 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-5">
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-50">Add New Event</h3>
              <p className="text-xs text-slate-500 mt-1">Mark a personal milestone or upcoming academic date.</p>
            </div>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className={lbl}>Event Name <span className="text-red-400">*</span></label>
                <input type="text" required
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. End-Semester Examination"
                  className={inp} />
              </div>
              <div>
                <label className={lbl}>Date <span className="text-red-400">*</span></label>
                <input type="date" required
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className={`${inp} cursor-pointer`} />
              </div>
              <div>
                <label className={lbl}>Description <span className="text-slate-700 font-normal normal-case">(optional)</span></label>
                <textarea rows={3}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Add notes, location, or any important details…"
                  className={`${inp} resize-none`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-700/60 bg-transparent text-slate-400 text-sm font-semibold hover:bg-slate-800 hover:text-slate-200 transition-all">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black hover:from-indigo-500 hover:to-violet-500 hover:scale-[1.01] transition-all shadow-lg shadow-indigo-500/25">
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
