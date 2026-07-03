// src/components/TodoList.jsx
// StudentOS - To-Do List Task Manager
// Usage: import TodoList from './components/TodoList'
// Storage key: 'studentos_tasks' in localStorage

import { useState, useEffect, useRef } from 'react';

function genId() {
  return Math.random().toString(36).substring(2,11) + Date.now().toString(36);
}

const TODO_CATS = ['Assignment','Lab','Exam','Viva','Custom'];

function catCls(cat) {
  const m = {
    Assignment:'bg-violet-500/15 text-violet-300 border-violet-400/25',
    Lab:'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
    Exam:'bg-rose-500/15 text-rose-300 border-rose-400/25',
    Viva:'bg-amber-500/15 text-amber-300 border-amber-400/25',
  };
  return m[cat] ?? 'bg-sky-500/15 text-sky-300 border-sky-400/25';
}

function getStatus(task) {
  if (task.completed) return 'completed';
  if (!task.deadline) return 'green';
  const now = new Date(), dl = new Date(task.deadline);
  if (isNaN(dl)) return 'green';
  if (dl < now) return 'missed';
  const d = (dl - now) / 86400000;
  return d > 3 ? 'green' : d > 1 ? 'yellow' : 'red';
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
}

function fmtDeadline(iso) {
  if (!iso) return 'No deadline set';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
    + ' · ' + d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}).toUpperCase();
}

function StatusDot({ status, sm=false }) {
  const size = sm ? 'w-2 h-2' : 'w-8 h-8';
  const clsMap = {
    completed:'bg-emerald-500 shadow-[0_0_14px_rgba(34,197,94,0.65)]',
    missed:   'bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.65)]',
    green:    'bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.55)]',
    yellow:   'bg-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.55)]',
    red:      'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.55)]',
  };
  return (
    <div className={`${size} rounded-full flex-shrink-0 flex items-center justify-center ${clsMap[status]??clsMap.green}`}>
      {!sm && status==='completed' && <span className="text-white text-sm font-bold leading-none">&#10003;</span>}
      {!sm && status==='missed'    && <span className="text-white text-xs font-bold leading-none">&#10005;</span>}
    </div>
  );
}

function TaskModal({ mode, task, onClose, onSave }) {
  const isCustomInit = task?.category && !['Assignment','Lab','Exam','Viva'].includes(task.category);
  const [form, setForm] = useState({
    title:          task?.title ?? '',
    description:    task?.description ?? '',
    deadline_date:  task?.deadline ? task.deadline.split('T')[0] : '',
    deadline_time:  task?.deadline ? task.deadline.substring(11,16) : '',
    category:       isCustomInit ? 'Custom' : (task?.category ?? 'Assignment'),
    customCategory: isCustomInit ? task.category : '',
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const inp = 'w-full bg-white/[0.04] border border-[rgba(108,99,255,0.25)] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-[rgba(108,99,255,0.6)] transition-colors font-[inherit]';
  const lbl = 'block text-[0.62rem] font-bold text-slate-500 uppercase tracking-[0.07em] mb-1.5';

  const handleSubmit = e => {
    e.preventDefault();
    const deadline = form.deadline_date ? `${form.deadline_date}T${form.deadline_time||'23:59'}` : null;
    const category = form.category==='Custom' ? (form.customCategory.trim()||'Custom') : form.category;
    onSave({ title:form.title.trim(), description:form.description, deadline, category });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-[460px] bg-[#1a1e35] border border-[rgba(108,99,255,0.3)] rounded-2xl p-7 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-extrabold text-slate-100">{mode==='add' ? '✦ Add New Task' : '✎ Edit Task'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-md border border-[rgba(108,99,255,0.2)] text-slate-500 hover:text-slate-200 text-lg flex items-center justify-center">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={lbl}>TO-DO Title</label>
            <input type="text" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Enter task title&hellip;" className={inp} required />
          </div>
          <div>
            <label className={lbl}>Description <span className="normal-case font-normal text-slate-700 tracking-normal">(one point per line)</span></label>
            <textarea value={form.description} onChange={e=>set('description',e.target.value)}
              placeholder="Read chapter 5&#10;Solve past papers&#10;Make summary notes&hellip;"
              rows={4} className={`${inp} resize-y`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Deadline Date</label>
              <input type="date" value={form.deadline_date} onChange={e=>set('deadline_date',e.target.value)} className={`${inp} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={lbl}>Deadline Time</label>
              <input type="time" value={form.deadline_time} onChange={e=>set('deadline_time',e.target.value)} className={`${inp} [color-scheme:dark]`} />
            </div>
          </div>
          <div>
            <label className={lbl}>Category</label>
            <select value={form.category} onChange={e=>set('category',e.target.value)} className={`${inp} bg-[#1a1e35] cursor-pointer`}>
              {TODO_CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            {form.category==='Custom' && (
              <input type="text" value={form.customCategory} onChange={e=>set('customCategory',e.target.value)}
                placeholder="Enter custom tag name&hellip;" className={`${inp} mt-2`} />
            )}
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[rgba(108,99,255,0.2)] text-slate-400 text-sm hover:text-slate-200 transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#6c63ff] to-[#8b85ff] text-white text-sm font-bold shadow-[0_4px_16px_rgba(108,99,255,0.4)]">
              {mode==='add' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/78 backdrop-blur-sm px-4">
      <div className="w-full max-w-[340px] bg-[#1a1e35] border border-red-500/30 rounded-2xl p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-xl">&#9888;</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-[rgba(108,99,255,0.2)] text-slate-400 text-sm hover:text-slate-200 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-bold transition-colors">Confirm Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function TodoList() {
  const [tasks,       setTasks]       = useState(()=>{ try{return JSON.parse(localStorage.getItem('studentos_tasks')||'[]');}catch{return [];} });
  const [activeId,    setActiveId]    = useState(null);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [modal,       setModal]       = useState(null);
  const [confirm,     setConfirm]     = useState(null);
  const [removeMode,  setRemoveMode]  = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const menuRef = useRef(null);

  useEffect(()=>{ localStorage.setItem('studentos_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(()=>{ if (!tasks.find(t=>t.id===activeId)) setActiveId(tasks[0]?.id??null); }, [tasks]);
  useEffect(()=>{
    const h = e=>{ if(menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[]);

  const activeTask = tasks.find(t=>t.id===activeId)??null;

  const saveTask = data => {
    if (modal.type==='add') {
      const t={id:genId(),...data,createdAt:new Date().toISOString(),completed:false,bookmarked:false};
      setTasks(p=>[t,...p]); setActiveId(t.id);
    } else {
      setTasks(p=>p.map(t=>t.id===modal.task.id?{...t,...data}:t));
    }
    setModal(null);
  };

  const toggleBk   = id=>setTasks(p=>p.map(t=>t.id===id?{...t,bookmarked:!t.bookmarked}:t));
  const toggleDone = id=>setTasks(p=>p.map(t=>t.id===id?{...t,completed:!t.completed}:t));
  const closeTask  = id=>{ const i=tasks.findIndex(t=>t.id===id); setActiveId(tasks.length>1?tasks[i===0?1:i-1].id:null); };
  const toggleSel  = id=>setSelectedIds(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});

  const triggerDel = ()=>{
    if (!selectedIds.size) return;
    const n=selectedIds.size;
    setConfirm({message:`Are you sure you want to remove the ${n} selected task${n>1?'s':''}?`,
      onConfirm:()=>{setTasks(p=>p.filter(t=>!selectedIds.has(t.id)));setSelectedIds(new Set());setRemoveMode(false);setConfirm(null);}});
  };

  const triggerClear = ()=>{
    const n=tasks.filter(t=>t.completed).length; setMenuOpen(false);
    if (!n) return;
    setConfirm({message:`Are you sure you want to clear all ${n} completed task${n>1?'s':''}?`,
      onConfirm:()=>{setTasks(p=>p.filter(t=>!t.completed));setConfirm(null);}});
  };

  const dot={green:'#22c55e',yellow:'#eab308',red:'#ef4444',completed:'#22c55e',missed:'#ef4444'};

  return (
    <div className="flex flex-col h-full gap-2 relative">

      {/* Context Menu */}
      <div ref={menuRef} className="absolute top-0 right-0 z-50">
        <button
          onClick={()=>{setMenuOpen(o=>!o);if(removeMode){setRemoveMode(false);setSelectedIds(new Set());}}}
          className="w-8 h-8 rounded-lg border border-[rgba(108,99,255,0.25)] bg-[rgba(108,99,255,0.07)] text-slate-400 hover:text-slate-100 hover:bg-[rgba(108,99,255,0.18)] flex items-center justify-center text-xl transition-colors"
          title="Task options">&#8942;</button>
        {menuOpen && (
          <div className="absolute top-9 right-0 bg-[#1a1e35] border border-[rgba(108,99,255,0.25)] rounded-xl overflow-hidden min-w-[190px] shadow-[0_10px_36px_rgba(0,0,0,0.55)]">
            {[
              {icon:'+',label:'Add Task',fn:()=>{setModal({type:'add'});setMenuOpen(false);}},
              {icon:'-',label:'Remove Task',fn:()=>{setRemoveMode(true);setMenuOpen(false);}},
              {icon:'✓',label:'Clear All Completed',fn:triggerClear},
            ].map(item=>(
              <button key={item.label} onClick={item.fn}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 bg-transparent hover:bg-[rgba(108,99,255,0.12)] text-slate-300 text-xs transition-colors text-left">
                <span className="text-violet-400 font-bold w-3.5 text-center">{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Task View */}
      {activeTask ? (
        <div className="flex-1 rounded-xl bg-white/[0.025] border border-[rgba(108,99,255,0.18)] p-4 flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Row 1 — Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button onClick={()=>toggleBk(activeTask.id)} title={activeTask.bookmarked?'Remove priority':'High priority'}
                className={`w-7 h-7 rounded-md border flex items-center justify-center text-sm transition-all ${activeTask.bookmarked?'border-amber-400/40 bg-amber-400/10 text-amber-400':'border-[rgba(108,99,255,0.2)] bg-white/[0.03] text-slate-500 hover:text-amber-400'}`}>
                &#128278;
              </button>
              <button onClick={()=>closeTask(activeTask.id)} title="Close task"
                className="w-7 h-7 rounded-md border border-red-400/25 bg-red-400/[0.06] text-red-400 hover:bg-red-400/15 flex items-center justify-center text-base font-bold transition-colors">
                &times;
              </button>
            </div>
            <span className="text-[0.6rem] text-slate-600 font-medium tracking-wide">Created {fmtDate(activeTask.createdAt)}</span>
            <div className="flex items-center gap-1.5">
              <button onClick={()=>setModal({type:'edit',task:activeTask})} title="Edit task"
                className="w-7 h-7 rounded-md border border-[rgba(108,99,255,0.3)] bg-[rgba(108,99,255,0.08)] text-violet-300 hover:bg-[rgba(108,99,255,0.2)] flex items-center justify-center text-sm transition-colors">
                &#9999;
              </button>
              <span className={`text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${catCls(activeTask.category)}`}>{activeTask.category}</span>
            </div>
          </div>
          {/* Row 2 — Heading + Title */}
          <div>
            <p className="m-0 text-[0.58rem] font-bold text-slate-500 underline underline-offset-2 uppercase tracking-[0.09em]">TO-DO list</p>
            <h3 className="mt-1 mb-0 text-[0.95rem] font-bold text-slate-100 leading-snug flex items-center gap-1.5">
              {activeTask.bookmarked && <span className="text-amber-400 text-sm">&#9733;</span>}
              {activeTask.title}
            </h3>
          </div>
          {/* Row 3 — Description */}
          {activeTask.description?.trim()
            ? <ul className="m-0 pl-4 flex flex-col gap-1">
                {activeTask.description.split('\n').filter(l=>l.trim()).map((line,i)=>
                  <li key={i} className="text-xs text-slate-400 leading-relaxed">{line}</li>)}
              </ul>
            : <p className="m-0 text-xs text-slate-700 italic">No description added.</p>
          }
          {/* Row 4 — Deadline + Status */}
          <div className="mt-auto pt-2.5 border-t border-[rgba(108,99,255,0.1)] flex items-end justify-between gap-2">
            <div>
              <p className="m-0 text-[0.55rem] font-bold text-slate-600 uppercase tracking-[0.08em] mb-1">Deadline</p>
              <p className="m-0 text-[0.7rem] text-slate-400 font-medium">&#128197; {fmtDeadline(activeTask.deadline)}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <StatusDot status={getStatus(activeTask)} />
              {getStatus(activeTask)!=='missed'
                ? <button onClick={()=>toggleDone(activeTask.id)} className="text-[0.55rem] px-2 py-0.5 rounded border border-[rgba(108,99,255,0.2)] text-slate-500 hover:text-slate-300 transition-colors whitespace-nowrap">
                    {activeTask.completed?'Undo':'Mark Done'}
                  </button>
                : <span className="text-[0.55rem] text-red-400 font-semibold">Missed</span>
              }
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 rounded-xl bg-white/[0.015] border border-dashed border-[rgba(108,99,255,0.18)] flex flex-col items-center justify-center gap-2.5 py-6">
          <span className="text-3xl">&#128203;</span>
          <p className="m-0 text-xs text-slate-600">No tasks yet. Start adding!</p>
          <button onClick={()=>setModal({type:'add'})} className="mt-1 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#6c63ff] to-[#8b85ff] text-white text-xs font-bold shadow-[0_4px_14px_rgba(108,99,255,0.4)]">+ Add Task</button>
        </div>
      )}

      {/* Tasks Nav Strip */}
      <div className="rounded-lg bg-white/[0.02] border border-[rgba(108,99,255,0.12)] px-2.5 pt-2 pb-2">
        <p className="m-0 mb-2 text-[0.53rem] font-bold text-slate-600 uppercase tracking-[0.14em]">TASKS</p>
        {tasks.length===0
          ? <p className="m-0 text-[0.7rem] text-slate-700">No tasks created yet.</p>
          : <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:rgba(108,99,255,0.3)_transparent]">
              {tasks.map(t=>{
                const st=getStatus(t),isA=t.id===activeId,iS=selectedIds.has(t.id);
                return (
                  <button key={t.id} onClick={()=>removeMode?toggleSel(t.id):setActiveId(t.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.68rem] font-medium border transition-all whitespace-nowrap ${iS?'border-red-400/50 bg-red-400/10 text-red-300':isA?'border-violet-400/55 bg-violet-400/15 text-violet-200 font-semibold':'border-[rgba(108,99,255,0.15)] bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:border-[rgba(108,99,255,0.3)]'}`}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:dot[st]??'#22c55e'}} />
                    {t.bookmarked && <span className="text-amber-400 text-[0.55rem]">&#9733;</span>}
                    {t.title.length>15?t.title.slice(0,13)+'\u2026':t.title}
                    {iS && <span className="text-red-400 text-[0.6rem] ml-0.5">&times;</span>}
                  </button>
                );
              })}
            </div>
        }
        {removeMode && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[rgba(108,99,255,0.1)]">
            <span className="text-[0.63rem] text-red-400">Select tasks to remove</span>
            <div className="ml-auto flex gap-1.5">
              <button onClick={triggerDel} disabled={!selectedIds.size}
                className={`px-3 py-1 rounded-md text-[0.68rem] font-bold text-white transition-all ${selectedIds.size?'bg-red-500 hover:bg-red-400 cursor-pointer':'bg-red-500/20 cursor-not-allowed'}`}>
                Delete ({selectedIds.size})
              </button>
              <button onClick={()=>{setRemoveMode(false);setSelectedIds(new Set());}}
                className="px-3 py-1 rounded-md text-[0.68rem] border border-[rgba(108,99,255,0.2)] text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {modal   && <TaskModal mode={modal.type} task={modal.task} onClose={()=>setModal(null)} onSave={saveTask} />}
      {confirm && <ConfirmModal message={confirm.message} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)} />}
    </div>
  );
}
