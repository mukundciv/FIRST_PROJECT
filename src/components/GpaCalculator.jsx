import React, { useState, useEffect, useRef } from 'react';

/* ── Grade mapping tables ──────────────────────────────────────────────────── */
const G_MAP    = { AA:10, AB:9, BB:8, BC:7, CC:6, CD:5, DD:4, FF:0 };
const G_RMAP   = { 10:'AA', 9:'AB', 8:'BB', 7:'BC', 6:'CC', 5:'CD', 4:'DD', 0:'FF' };
const L_GRADES = ['AA','AB','BB','BC','CC','CD','DD','FF'];
const N_POINTS = [10,9,8,7,6,5,4,3,2,1,0];

let _id = 0;
const genId = () => 'g' + (++_id);

function createGpaSubject() {
  return { id: genId(), name: '', credits: '', letterGrade: '', numericPointer: '' };
}

function getSubjectPoints(s) {
  if (s.letterGrade)          return G_MAP[s.letterGrade];
  if (s.numericPointer !== '') return Number(s.numericPointer);
  return null;
}

/* ── Confirm Modal ─────────────────────────────────────────────────────────── */
function GpaConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-[#1a1e35] border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-xl">⚠</span>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          <button onClick={onCancel}
            className="px-5 py-2 rounded-lg border border-indigo-500/20 bg-transparent text-slate-400 text-sm cursor-pointer hover:border-indigo-500/40 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-5 py-2 rounded-lg bg-red-500 text-white text-sm font-bold cursor-pointer hover:bg-red-600 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Subject Row ───────────────────────────────────────────────────────────── */
function GpaSubjectRow({ subj, onUpdate, onDelete, removeMode, selected, onToggleSelect, index }) {
  const handleLetter  = v => onUpdate({ letterGrade: v, numericPointer: v ? String(G_MAP[v]) : '' });
  const handlePointer = v => onUpdate({ numericPointer: v, letterGrade: v !== '' ? (G_RMAP[Number(v)] || '') : '' });

  const baseRow = `rounded-xl p-4 flex flex-col gap-3 transition-all duration-200
    \${selected ? 'bg-red-500/7 border border-red-500/40' : 'bg-white/[0.022] border border-indigo-500/15'}
    \${removeMode ? 'cursor-pointer' : 'cursor-default'}`;

  const selectClass = "w-full bg-white/[0.04] border border-indigo-500/20 rounded-lg text-slate-200 text-xs outline-none font-inherit px-2 py-1.5 cursor-pointer";
  const labelClass  = "block text-[0.55rem] font-bold text-slate-500 uppercase tracking-wider mb-1";
  
  // Contrast fixes for the select dropdown options
  const optStyle = { background: '#1a1e35', color: '#e8eaf8' };
  const optMuted = { background: '#1a1e35', color: '#94a3b8' };

  return (
    <div className={baseRow} onClick={() => removeMode && onToggleSelect(subj.id)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[0.62rem] font-bold text-slate-500 uppercase tracking-wider">
          Subject {index + 1}
        </span>
        <button onClick={e => { e.stopPropagation(); onDelete(subj.id); }}
          className="w-6 h-6 rounded border border-red-500/30 bg-red-500/6 text-red-400 cursor-pointer flex items-center justify-center text-sm font-bold hover:bg-red-500/20 transition-colors">
          ✕
        </button>
      </div>

      {/* Subject Name */}
      <input type="text" placeholder="Subject name (optional)" value={subj.name}
        onChange={e => onUpdate({ name: e.target.value })}
        className="w-full bg-white/[0.04] border border-indigo-500/20 rounded-lg text-slate-200 text-xs outline-none px-3 py-1.5 placeholder-slate-600"/>

      {/* Credits + Grades */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelClass}>Credits</label>
          <select value={subj.credits} onChange={e => onUpdate({ credits: e.target.value })} className={selectClass}>
            <option value="" style={optMuted}>--</option>
            {[0,1,2,3,4,5,6,7,8,9,10].map(c => <option key={c} value={c} style={optStyle}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Subject Grade</label>
          <select value={subj.letterGrade} onChange={e => handleLetter(e.target.value)} className={selectClass}>
            <option value="" style={optMuted}>--</option>
            {L_GRADES.map(g => <option key={g} value={g} style={optStyle}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Pointer (0–10)</label>
          <select value={subj.numericPointer} onChange={e => handlePointer(e.target.value)} className={selectClass}>
            <option value="" style={optMuted}>--</option>
            {N_POINTS.map(p => <option key={p} value={p} style={optStyle}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Remove mode indicator */}
      {removeMode && (
        <div className="flex items-center gap-2 pt-1">
          <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0
            \${selected ? 'border-red-400 bg-red-400/20' : 'border-indigo-500/30 bg-transparent'}`}>
            {selected && <span className="text-red-400 text-[0.6rem] font-bold">✓</span>}
          </div>
          <span className={`text-[0.6rem] \${selected ? 'text-red-400' : 'text-slate-500'}`}>
            {selected ? 'Selected for removal' : 'Click to select'}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Main GPA Calculator ───────────────────────────────────────────────────── */
export default function GpaCalculator() {
  const [activeTab,    setActiveTab]    = useState('sgpa');

  /* Linked current semester subjects (Two-way syncing) */
  const [subj,         setSubj]         = useState([]);

  // Persisted results & errors for SGPA
  const [sgpaResult,   setSgpaResult]   = useState(null);
  const [sgpaError,    setSgpaError]    = useState('');

  // Persisted results & errors for CGPA
  const [cgpaResult,   setCgpaResult]   = useState(null);
  const [cgpaError,    setCgpaError]    = useState('');
  const [prevCgpa,     setPrevCgpa]     = useState('');
  const [prevCredits,  setPrevCredits]  = useState('');

  // Shared UI state
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [removeMode,   setRemoveMode]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [confirm,      setConfirm]      = useState(null);

  const menuAreaRef = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (menuAreaRef.current && !menuAreaRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchTab   = t  => { setActiveTab(t); setMenuOpen(false); setRemoveMode(false); setSelectedIds(new Set()); };
  const addSubject  = () => setSubj(p => [...p, createGpaSubject()]);
  const updateSubj  = (id, fields) => setSubj(p => p.map(s => s.id === id ? { ...s, ...fields } : s));

  const deleteSubj  = id => setConfirm({
    message: 'Are you sure you want to delete this subject?',
    onConfirm: () => { setSubj(p => p.filter(s => s.id !== id)); setConfirm(null); },
  });

  const removeAll   = () => setConfirm({
    message: 'Remove ALL subjects?',
    onConfirm: () => { setSubj([]); setRemoveMode(false); setSelectedIds(new Set()); setConfirm(null); },
  });

  const removeSelected = () => {
    if (!selectedIds.size) return;
    setConfirm({
      message: `Remove \${selectedIds.size} selected subject\${selectedIds.size > 1 ? 's' : ''}?`,
      onConfirm: () => {
        setSubj(p => p.filter(s => !selectedIds.has(s.id)));
        setSelectedIds(new Set()); setRemoveMode(false); setConfirm(null);
      },
    });
  };

  const toggleSel = id => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* SGPA = Σ(credits × points) / Σ(credits) */
  const calcSgpa = () => {
    if (subj.length === 0) return;
    let totalC = 0, totalQP = 0;
    for (const s of subj) {
      if (s.credits === '') { setSgpaError('Select Credits for every subject.'); setSgpaResult(null); return; }
      const p = getSubjectPoints(s);
      if (p === null) { setSgpaError('Select Subject Grade or Pointer for every subject.'); setSgpaResult(null); return; }
      totalC  += Number(s.credits);
      totalQP += Number(s.credits) * p;
    }
    if (totalC === 0) { setSgpaError('Total credits cannot be zero.'); setSgpaResult(null); return; }
    setSgpaError('');
    setSgpaResult((totalQP / totalC).toFixed(2));
  };

  /* CGPA = (prevCgpa × prevCredits + Σ(credits × points)) / (prevCredits + Σ(credits)) */
  const calcCgpa = () => {
    if (subj.length === 0) return;
    const pC = parseFloat(prevCgpa);
    const pK = parseFloat(prevCredits);
    if (isNaN(pC) || pC < 0 || pC > 10) { setCgpaError('Enter valid Previous CGPA (0–10).'); setCgpaResult(null); return; }
    if (isNaN(pK) || pK < 0)             { setCgpaError('Enter valid Previous Total Credits.'); setCgpaResult(null); return; }
    let totalC = 0, totalQP = 0;
    for (const s of subj) {
      if (s.credits === '') { setCgpaError('Select Credits for every subject.'); setCgpaResult(null); return; }
      const p = getSubjectPoints(s);
      if (p === null) { setCgpaError('Select Subject Grade or Pointer for every subject.'); setCgpaResult(null); return; }
      totalC  += Number(s.credits);
      totalQP += Number(s.credits) * p;
    }
    const allC = pK + totalC;
    if (allC === 0) { setCgpaError('Total credits cannot be zero.'); setCgpaResult(null); return; }
    setCgpaError('');
    setCgpaResult(((pC * pK + totalQP) / allC).toFixed(2));
  };

  const resultColor = v => {
    const n = parseFloat(v);
    if (n >= 9) return 'text-green-400';
    if (n >= 7) return 'text-blue-400';
    if (n >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const curErr    = activeTab === 'sgpa' ? sgpaError   : cgpaError;
  const curResult = activeTab === 'sgpa' ? sgpaResult  : cgpaResult;
  const calcFn    = activeTab === 'sgpa' ? calcSgpa    : calcCgpa;

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Tab Toggle ── */}
      <div className="flex gap-1.5 bg-white/[0.03] border border-indigo-500/12 rounded-xl p-1">
        {['sgpa','cgpa'].map(tab => (
          <button key={tab} onClick={() => switchTab(tab)}
            className={`flex-1 py-2.5 rounded-lg border-none text-xs font-bold cursor-pointer uppercase tracking-wider transition-all duration-200
              \${activeTab === tab
                ? 'bg-indigo-500/28 text-slate-100 shadow-lg shadow-indigo-500/20'
                : 'bg-transparent text-slate-500 hover:text-slate-400'}`}>
            Calculate {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Workspace ── */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-indigo-500/20">

        {/* Three-dot menu */}
        <div ref={menuAreaRef} className="relative self-end">
          <button onClick={() => setMenuOpen(o => !o)}
            className={`w-8 h-8 rounded-lg border text-slate-400 cursor-pointer text-xl flex items-center justify-center transition-all duration-200
              \${menuOpen ? 'bg-indigo-500/22 border-indigo-500/40 text-slate-200' : 'bg-indigo-500/7 border-indigo-500/25 hover:bg-indigo-500/22 hover:text-slate-200'}`}>
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute top-9 right-0 bg-[#1a1e35] border border-indigo-500/25 rounded-xl overflow-hidden w-48 shadow-2xl z-50">
              {[
                { icon:'＋', label:'Add Subject',         fn: () => { addSubject();        setMenuOpen(false); } },
                { icon:'−',  label:'Remove Subject Mode', fn: () => { setRemoveMode(true); setMenuOpen(false); } },
                { icon:'✕',  label:'Remove All',          fn: () => { removeAll();         setMenuOpen(false); } },
              ].map((item, i) => (
                <button key={item.label} onClick={item.fn}
                  className={`flex items-center gap-2.5 w-full px-4 py-2.5 bg-transparent border-none text-slate-300 text-xs cursor-pointer text-left hover:bg-indigo-500/12 transition-colors
                    \${i > 0 ? 'border-t border-indigo-500/8' : ''}`}>
                  <span className="text-violet-400 font-bold w-3.5 text-center flex-shrink-0">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CGPA Extra Fields */}
        {activeTab === 'cgpa' && (
          <div className="grid grid-cols-2 gap-3 bg-indigo-500/4 border border-indigo-500/12 rounded-xl p-4">
            <div>
              <label className="block text-[0.62rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Current CGPA (till last semester)
              </label>
              <input type="number" min="0" max="10" step="0.01" placeholder="e.g. 8.45"
                value={prevCgpa} onChange={e => setPrevCgpa(e.target.value)}
                className="w-full bg-white/[0.04] border border-indigo-500/22 rounded-lg text-slate-200 text-sm outline-none px-3 py-2 placeholder-slate-600"/>
            </div>
            <div>
              <label className="block text-[0.62rem] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Total Credits (till last semester)
              </label>
              <input type="number" min="0" placeholder="e.g. 120"
                value={prevCredits} onChange={e => setPrevCredits(e.target.value)}
                className="w-full bg-white/[0.04] border border-indigo-500/22 rounded-lg text-slate-200 text-sm outline-none px-3 py-2 placeholder-slate-600"/>
            </div>
          </div>
        )}

        {/* Subject list / Zero State */}
        {subj.length === 0 ? (
          <div className="flex-1 rounded-xl bg-white/[0.015] border border-dashed border-indigo-500/18 flex flex-col items-center justify-center gap-2 p-10">
            <span className="text-4xl">📚</span>
            <p className="m-0 text-xs text-slate-500 font-medium">Add at least one subject to calculate.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {subj.map((s, i) => (
              <GpaSubjectRow key={s.id} subj={s} index={i}
                onUpdate={fields => updateSubj(s.id, fields)}
                onDelete={() => deleteSubj(s.id)}
                removeMode={removeMode}
                selected={selectedIds.has(s.id)}
                onToggleSelect={toggleSel}/>
            ))}
          </div>
        )}

        {/* Remove mode bar */}
        {removeMode && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-500/6 border border-red-500/20 flex-shrink-0">
            <span className="text-xs text-red-400 font-medium">
              {selectedIds.size > 0 ? `\${selectedIds.size} selected` : 'Click subjects to select'}
            </span>
            <div className="ml-auto flex gap-2">
              <button onClick={removeSelected} disabled={!selectedIds.size}
                className={`px-3 py-1 rounded-lg border-none text-xs font-bold text-white transition-colors
                  \${selectedIds.size ? 'bg-red-500 cursor-pointer hover:bg-red-600' : 'bg-red-500/20 cursor-default'}`}>
                Delete ({selectedIds.size})
              </button>
              <button onClick={() => { setRemoveMode(false); setSelectedIds(new Set()); }}
                className="px-3 py-1 rounded-lg border border-indigo-500/22 bg-transparent text-slate-400 text-xs cursor-pointer hover:text-slate-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {curErr && (
          <div className="px-4 py-2.5 rounded-xl bg-red-500/8 border border-red-500/25 text-xs text-red-400 leading-relaxed">
            {curErr}
          </div>
        )}

        {/* Result */}
        {curResult && (
          <div className="px-4 py-6 rounded-2xl bg-indigo-500/7 border border-indigo-500/22 text-center">
            <p className="m-0 mb-1 text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
              Your {activeTab.toUpperCase()} is
            </p>
            <p className={`m-0 text-5xl font-black leading-none tracking-tight \${resultColor(curResult)}`}>
              {curResult}
            </p>
            <p className="m-0 mt-1 text-xs text-slate-500">out of 10.00</p>
          </div>
        )}

        {/* Calculate Button */}
        <button onClick={calcFn} disabled={subj.length === 0}
          className={`py-3.5 rounded-xl border-none text-white text-sm font-bold tracking-wide transition-all duration-200 flex-shrink-0
            \${subj.length === 0 
              ? 'bg-indigo-500/15 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-br from-indigo-500/85 to-violet-500/85 cursor-pointer shadow-lg shadow-indigo-500/30 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/45'}`}>
          Calculate {activeTab.toUpperCase()}
        </button>

      </div>

      {confirm && <GpaConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)}/>}
    </div>
  );
}
