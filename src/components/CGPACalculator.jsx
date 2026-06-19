import { useState, useCallback } from 'react';

// ── Grade Scale ──────────────────────────────────────────────────────────
const GRADE_SCALE = [
  { grade: 'O',  label: 'Outstanding',  points: 10, color: '#c4b5fd', bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.45)' },
  { grade: 'A+', label: 'Excellent',    points: 9,  color: '#a5b4fc', bg: 'rgba(99,102,241,0.13)',  border: 'rgba(99,102,241,0.4)'  },
  { grade: 'A',  label: 'Very Good',    points: 8,  color: '#818cf8', bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.3)'  },
  { grade: 'B+', label: 'Good',         points: 7,  color: '#10b981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.3)'  },
  { grade: 'B',  label: 'Above Average',points: 6,  color: '#34d399', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
  { grade: 'E',  label: 'Reappear',     points: 4,  color: '#f87171', bg: 'rgba(244,63,94,0.10)',   border: 'rgba(244,63,94,0.35)'  },
  { grade: 'F',  label: 'Fail',         points: 0,  color: '#f43f5e', bg: 'rgba(244,63,94,0.15)',   border: 'rgba(244,63,94,0.45)'  },
];

// ── Shared helper (module-level, used by all components) ──────────────────────
function getGradeStyle(grade) {
  const info = GRADE_SCALE.find(g => g.grade === grade);
  if (!info) return {};
  return { color: info.color, background: info.bg, borderColor: info.border };
}

// ── Subject Definitions ──────────────────────────────────────────────────────
// "Maths" group  →  has Maths, no OS, no OS Lab
const MATHS_GROUP = [
  { id: 'ai',     name: 'Artificial Intelligence', credits: 4, isMinor: false },
  { id: 'java',   name: 'Java Programming',         credits: 4, isMinor: false },
  { id: 'cse211', name: 'CSE-211',                  credits: 4, isMinor: false },
  { id: 'maths',  name: 'Mathematics',              credits: 4, isMinor: false },
  { id: 'pea',    name: 'PEA',                      credits: 3, isMinor: false },
];

// "OS" group  →  has OS + OS Lab, no Maths
const OS_GROUP = [
  { id: 'ai',     name: 'Artificial Intelligence', credits: 4, isMinor: false },
  { id: 'java',   name: 'Java Programming',         credits: 4, isMinor: false },
  { id: 'cse211', name: 'CSE-211',                  credits: 4, isMinor: false },
  { id: 'os',     name: 'Operating System',         credits: 3, isMinor: false },
  { id: 'pea',    name: 'PEA',                      credits: 3, isMinor: false },
  { id: 'oslab',  name: 'OS Lab',                   credits: 1, isMinor: false },
];

const MINOR_TEMPLATE = [
  { id: 'minor1', name: '', credits: 3, isMinor: true },
  { id: 'minor2', name: '', credits: 3, isMinor: true },
];

// ── Grade calculation from marks ─────────────────────────────────────────────
// Returns { grade, points, valid, empty, invalid, reappear }
function calcGradeFromMarks(raw) {
  if (raw === '' || raw === null || raw === undefined) {
    return { grade: '', points: null, valid: false, empty: true, invalid: false, reappear: false };
  }
  const m = Number(raw);
  if (isNaN(m) || m < 0 || m > 100) {
    return { grade: 'INVALID', points: null, valid: false, empty: false, invalid: true, reappear: false };
  }
  // Below 40 → show nothing (return empty-like state)
  if (m < 40) {
    return { grade: '', points: null, valid: false, empty: false, invalid: false, reappear: false, belowMin: true };
  }
  if (m >= 90) return { grade: 'O',  points: 10, valid: true, empty: false, invalid: false, reappear: false };
  if (m >= 80) return { grade: 'A+', points: 9,  valid: true, empty: false, invalid: false, reappear: false };
  if (m >= 70) return { grade: 'A',  points: 8,  valid: true, empty: false, invalid: false, reappear: false };
  if (m >= 60) return { grade: 'B+', points: 7,  valid: true, empty: false, invalid: false, reappear: false };
  if (m >= 40) return { grade: 'B',  points: 6,  valid: true, empty: false, invalid: false, reappear: false };
  // E (Reappear) — won't hit but safety net
  return { grade: 'E', points: 4, valid: false, empty: false, invalid: false, reappear: true };
}

function cgpaLabel(cgpa) {
  if (cgpa >= 9)   return { label: 'Outstanding 🌟', color: '#c4b5fd' };
  if (cgpa >= 8)   return { label: 'Excellent ✨',   color: '#a5b4fc' };
  if (cgpa >= 7)   return { label: 'Very Good 👍',   color: '#818cf8' };
  if (cgpa >= 6)   return { label: 'Good 🙂',        color: '#34d399' };
  if (cgpa >= 5)   return { label: 'Average 😐',      color: '#fbbf24' };
  return                  { label: 'Below Average',   color: '#f87171' };
}

// ── Empty subject marks state ────────────────────────────────────────────────
function makeSubjectState(subjects) {
  return subjects.map(s => ({ ...s, marks: '' }));
}

// ═════════════════════════════════════════════════════════════════════════════
export default function CGPACalculator() {
  const [studentName, setStudentName]     = useState('');
  const [semGroup, setSemGroup]           = useState('maths'); // 'maths' | 'os'
  const [subjects, setSubjects]           = useState(makeSubjectState(MATHS_GROUP));
  const [showMinors, setShowMinors]       = useState(false);
  const [minors, setMinors]               = useState(makeSubjectState(MINOR_TEMPLATE));
  const [result, setResult]               = useState(null);
  const [nameError, setNameError]         = useState(false); // blink when locked

  const nameEntered = studentName.trim().length > 0;

  // Switch semester group
  const handleGroupChange = (g) => {
    setSemGroup(g);
    setSubjects(makeSubjectState(g === 'maths' ? MATHS_GROUP : OS_GROUP));
    setResult(null);
  };

  // Update subject marks
  const updateMarks = useCallback((id, val, isMinor = false) => {
    if (!nameEntered) {
      setNameError(true);
      setTimeout(() => setNameError(false), 600);
      return;
    }
    if (isMinor) {
      setMinors(prev => prev.map(m => m.id === id ? { ...m, marks: val } : m));
    } else {
      setSubjects(prev => prev.map(s => s.id === id ? { ...s, marks: val } : s));
    }
    setResult(null);
  }, [nameEntered]);

  // Update minor name
  const updateMinorName = (id, val) => {
    setMinors(prev => prev.map(m => m.id === id ? { ...m, name: val } : m));
  };

  // ── Calculate ──────────────────────────────────────────────────────────────
  const calculate = () => {
    if (!nameEntered) {
      setNameError(true);
      setTimeout(() => setNameError(false), 600);
      return;
    }

    const activeMinors = showMinors ? minors : [];
    const allSubjects  = [...subjects, ...activeMinors];

    // Validate and resolve each subject
    const resolved = allSubjects.map(s => {
      const g = calcGradeFromMarks(s.marks);
      return { ...s, ...g };
    });

    // Check for invalid entries (marks outside 0-100)
    const invalidEntries = resolved.filter(s => s.invalid);
    if (invalidEntries.length > 0) {
      setResult({ error: 'invalid', subjects: resolved });
      return;
    }

    // Check for empty marks
    const emptyEntries = resolved.filter(s => s.empty);
    if (emptyEntries.length > 0) {
      setResult({ error: 'empty', subjects: resolved });
      return;
    }

    // Check below 40 (belowMin) — treat same as no-result / Reappear
    const belowMinEntries = resolved.filter(s => s.belowMin);
    if (belowMinEntries.length > 0) {
      setResult({ error: 'belowMin', subjects: resolved });
      return;
    }

    // Check for Reappear (E grade)
    const reappearSubjects = resolved.filter(s => s.reappear || s.grade === 'E');
    if (reappearSubjects.length > 0) {
      setResult({ error: 'reappear', subjects: resolved, reappearSubjects });
      return;
    }

    // CGPA calculation
    let totalWeighted = 0;
    let totalCredits  = 0;
    resolved.forEach(s => {
      if (s.valid && s.points !== null) {
        totalWeighted += s.points * s.credits;
        totalCredits  += s.credits;
      }
    });

    const cgpa = totalCredits > 0 ? +(totalWeighted / totalCredits).toFixed(2) : 0;

    setResult({
      cgpa,
      totalCredits,
      totalWeighted,
      subjects: resolved.filter(s => !s.isMinor),
      minors:   resolved.filter(s => s.isMinor),
      hasReappear: false,
    });
  };



  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStudentName('');
    setSubjects(makeSubjectState(semGroup === 'maths' ? MATHS_GROUP : OS_GROUP));
    setMinors(makeSubjectState(MINOR_TEMPLATE));
    setResult(null);
    setShowMinors(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="calc-bg">
      <div className="calc-container">

        {/* ── HEADER ── */}
        <header className="calc-header">
          <div className="header-badge">
            <span className="badge-dot" />
            Grade Point Average
          </div>
          <h1>CGPA Calculator</h1>
          <p>Enter your marks to calculate your SGPA / CGPA instantly based on the grading scale</p>
        </header>

        <div className="calc-sections">

          {/* ── STUDENT INFO ── */}
          <div className={`glass-card${nameError ? ' name-shake' : ''}`}>
            <div className="section-header">
              <div className="section-icon">👤</div>
              <div>
                <h2>Student Information</h2>
                <p>Enter your name to unlock marks entry</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Full Name *</label>
                <input
                  className={`form-input${nameError ? ' input-error-glow' : ''}`}
                  type="text"
                  placeholder="e.g. Sandeep Singh"
                  value={studentName}
                  onChange={e => { setStudentName(e.target.value); setResult(null); }}
                  id="student-name"
                  autoComplete="off"
                />
                {!nameEntered && (
                  <span className="field-hint">⚠️ Enter your name first to start entering marks</span>
                )}
                {nameEntered && (
                  <span className="field-hint green">✅ Hi, {studentName.trim().split(' ')[0]}! You can now enter your marks.</span>
                )}
              </div>
            </div>
          </div>

          {/* ── SEMESTER CHOICE ── */}
          <div className="glass-card">
            <div className="section-header">
              <div className="section-icon">📚</div>
              <div>
                <h2>Semester Configuration</h2>
                <p>Choose your current semester subject group</p>
              </div>
            </div>
            <div className="toggle-card" style={{ marginBottom: 0 }}>
              <p className="toggle-title">📌 Which subjects do you have this semester?</p>
              <div className="toggle-options">
                <div className="toggle-option">
                  <input type="radio" id="grp-maths" name="semGroup" value="maths"
                    checked={semGroup === 'maths'}
                    onChange={() => handleGroupChange('maths')} />
                  <label htmlFor="grp-maths">
                    <span className="toggle-icon">🧮</span>
                    <span className="toggle-text">
                      <span className="toggle-name">Group A — With Maths</span>
                      <span className="toggle-desc">Java · CSE211 · Maths · PEA · AI</span>
                    </span>
                  </label>
                </div>
                <div className="toggle-option">
                  <input type="radio" id="grp-os" name="semGroup" value="os"
                    checked={semGroup === 'os'}
                    onChange={() => handleGroupChange('os')} />
                  <label htmlFor="grp-os">
                    <span className="toggle-icon">💻</span>
                    <span className="toggle-text">
                      <span className="toggle-name">Group B — With OS</span>
                      <span className="toggle-desc">Java · CSE211 · OS · OS Lab · PEA · AI</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ── SUBJECTS ── */}
          <div className="glass-card">
            <div className="section-header">
              <div className="section-icon">📝</div>
              <div>
                <h2>Subject Marks</h2>
                <p>Sorted by credits (high → low) · Enter marks out of 100</p>
              </div>
            </div>

            <div className="weightage-highlight-banner">
              <span className="banner-icon">⚠️</span>
              <span className="banner-text">
                Put only weightage marks out of 100 for correct approx calculation
              </span>
            </div>



            {/* Lock overlay indicator */}
            {!nameEntered && (
              <div className="marks-locked-banner">
                🔒 Enter your name above to unlock marks input
              </div>
            )}

            <div className="subjects-container" style={{ marginTop: 16 }}>
              {/* Column headers */}
              <div className="subject-col-header">
                <span>Subject</span>
                <span>Credits</span>
                <span>Marks /100</span>
                <span>Grade · GP</span>
              </div>

              {subjects.map(s => {
                const g = calcGradeFromMarks(s.marks);
                const hasVal = s.marks !== '';
                return (
                  <SubjectRow
                    key={s.id}
                    subject={s}
                    gradeInfo={g}
                    hasVal={hasVal}
                    locked={!nameEntered}
                    onChange={val => updateMarks(s.id, val)}
                    onLockClick={() => {
                      setNameError(true);
                      setTimeout(() => setNameError(false), 600);
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* ── MINORS ── */}
          <div className="glass-card">
            <div className="section-header">
              <div className="section-icon">🔬</div>
              <div>
                <h2>Minor Subjects</h2>
                <p>Optional — 2 minors, 3 credits each</p>
              </div>
            </div>

            <label className="minor-toggle" htmlFor="minor-switch">
              <span className="toggle-switch">
                <input type="checkbox" id="minor-switch"
                  checked={showMinors}
                  onChange={e => { setShowMinors(e.target.checked); setResult(null); }} />
                <span className="toggle-slider" />
              </span>
              <span className="minor-toggle-text">
                <span className="minor-toggle-name">
                  {showMinors ? '✅ Minor subjects included' : 'Include minor subjects in CGPA'}
                </span>
                <span className="minor-toggle-desc">Each minor carries 3 credits</span>
              </span>
            </label>

            {showMinors && (
              <div className="subjects-container">
                <div className="subject-col-header">
                  <span>Minor Subject Name</span>
                  <span>Credits</span>
                  <span>Marks /100</span>
                  <span>Grade · GP</span>
                </div>
                {minors.map((m, i) => {
                  const g = calcGradeFromMarks(m.marks);
                  return (
                    <div className="minor-row" key={m.id}>
                      <div className="subject-name-cell">
                        <input
                          className="marks-input"
                          type="text"
                          placeholder={`Minor ${i + 1} subject name`}
                          value={m.name}
                          onChange={e => updateMinorName(m.id, e.target.value)}
                          disabled={!nameEntered}
                          style={{ opacity: nameEntered ? 1 : 0.4 }}
                        />
                        <span className="minor-badge">MINOR</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="credit-pill">{m.credits} cr</span>
                      </div>
                      <input
                        className="marks-input"
                        type="number"
                        min="0"
                        max="100"
                        placeholder={nameEntered ? '0 – 100' : '🔒'}
                        value={m.marks}
                        disabled={!nameEntered}
                        onChange={e => updateMarks(m.id, e.target.value, true)}
                        onClick={() => {
                          if (!nameEntered) {
                            setNameError(true);
                            setTimeout(() => setNameError(false), 600);
                          }
                        }}
                        style={{ opacity: nameEntered ? 1 : 0.4, cursor: nameEntered ? 'auto' : 'not-allowed' }}
                      />
                      <GradeDisplay g={g} marks={m.marks} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── CALCULATE BUTTON ── */}
          <button
            className="calculate-btn"
            onClick={calculate}
            disabled={!nameEntered}
            title={!nameEntered ? 'Enter your name first' : ''}
          >
            {nameEntered ? '⚡ Calculate My CGPA' : '🔒 Enter Name to Calculate'}
          </button>

          {/* ── RESULT ── */}
          {result && <ResultPanel result={result} studentName={studentName} />}

          {/* ── RESET ── */}
          <button className="reset-btn" onClick={reset}>↩ Reset Calculator</button>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SubjectRow({ subject, gradeInfo: g, locked, onChange, onLockClick }) {
  const hasGrade = g.valid;
  return (
    <div className={`subject-row${hasGrade ? ' has-grade' : ''}`}>
      <div className="subject-name-cell">
        <span className="subject-name">{subject.name}</span>
        <span className="subject-credit-badge">
          <span className="credit-dot" />
          {subject.credits} Credits
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="credit-pill">{subject.credits} cr</span>
      </div>

      <input
        className="marks-input"
        type="number"
        min="0"
        max="100"
        placeholder={locked ? '🔒' : '0 – 100'}
        value={subject.marks}
        disabled={locked}
        onChange={e => onChange(e.target.value)}
        onClick={() => { if (locked) onLockClick(); }}
        style={{ opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'auto' }}
      />

      <GradeDisplay g={g} marks={subject.marks} />
    </div>
  );
}

function GradeDisplay({ g, marks }) {
  if (marks === '' || marks === null || marks === undefined) {
    return <div className="gp-display gp-empty">—</div>;
  }
  if (g.invalid) {
    return <div className="gp-display" style={{ background: 'rgba(244,63,94,0.1)', borderColor: 'rgba(244,63,94,0.4)', color: '#f87171', fontSize: 11, fontWeight: 700 }}>INVALID</div>;
  }
  if (g.belowMin) {
    return <div className="gp-display" style={{ background: 'rgba(96,96,160,0.08)', borderColor: 'rgba(96,96,160,0.2)', color: '#6060a0', fontSize: 11 }}>—</div>;
  }
  if (!g.valid) {
    return <div className="gp-display gp-empty">—</div>;
  }
  const style = getGradeStyle(g.grade);
  return (
    <div className="gp-display" style={{ ...style, border: `1px solid ${style.borderColor}`, flexDirection: 'column', height: 'auto', padding: '5px 10px', gap: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 800 }}>{g.grade} grade</span>
      <span style={{ fontSize: 10, opacity: 0.75 }}>{g.points} pts</span>
    </div>
  );
}

// ── Result Panel ──────────────────────────────────────────────────────────────
function ResultPanel({ result, studentName }) {
  // Error states
  if (result.error === 'invalid') {
    const bad = result.subjects.filter(s => s.invalid);
    return (
      <div className="glass-card result-panel">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Invalid Marks Detected</h3>
          <p>The following subjects have invalid marks (must be 0–100):</p>
          <ul className="error-list">
            {bad.map(s => <li key={s.id}><strong>{s.name}</strong>: "{s.marks}" is not valid</li>)}
          </ul>
        </div>
      </div>
    );
  }

  if (result.error === 'belowMin') {
    const bad = result.subjects.filter(s => s.belowMin);
    return (
      <div className="glass-card result-panel">
        <div className="error-state" style={{ borderColor: 'rgba(96,96,160,0.3)' }}>
          <div className="error-icon">📉</div>
          <h3>Marks Too Low</h3>
          <p>The following subjects have marks below 40 — no grade can be assigned:</p>
          <ul className="error-list">
            {bad.map(s => <li key={s.id}><strong>{s.name}</strong>: {s.marks} marks</li>)}
          </ul>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            Please enter marks ≥ 40 or contact your institute for clarification.
          </p>
        </div>
      </div>
    );
  }

  if (result.error === 'empty') {
    return (
      <div className="glass-card result-panel">
        <div className="error-state warning">
          <div className="error-icon">📋</div>
          <h3>Marks Incomplete</h3>
          <p>Please enter marks for all subjects before calculating.</p>
        </div>
      </div>
    );
  }

  if (result.error === 'reappear') {
    return (
      <div className="glass-card result-panel">
        <div className="error-state reappear">
          <div className="error-icon">🔴</div>
          <h3>Reappear Detected — CGPA Not Calculated</h3>
          <p>You have Reappear (E grade) in the following subject(s):</p>
          <ul className="error-list reappear-list">
            {result.reappearSubjects.map(s => (
              <li key={s.id}>
                <strong>{s.name}</strong>
                <span className="reappear-chip">E · Reappear</span>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 12, fontSize: 12, color: 'rgba(244,63,94,0.7)' }}>
            Clear all reappears to view your CGPA.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ──
  const { cgpa, totalCredits, totalWeighted, subjects, minors, allSubjects } = result;
  const { label: cgpaLab, color: cgpaColor } = cgpaLabel(cgpa);
  const allRows = [...subjects, ...(minors || [])];

  return (
    <div className="glass-card result-panel">
      {/* Hero */}
      <div className="result-hero">
        <div className="result-name">{studentName}</div>
        <div className="result-cgpa-label">Semester Grade Point Average</div>
        <div className="result-cgpa-value">{cgpa}</div>
        <div className="result-grade-tag" style={{
          background: 'rgba(99,102,241,0.1)',
          borderColor: 'rgba(99,102,241,0.35)',
          color: cgpaColor,
        }}>
          {cgpaLab}
        </div>
        <div className="result-total-credits">Total Credits: {totalCredits} · Weighted Points: {totalWeighted.toFixed(1)}</div>
      </div>

      {/* Stats */}
      <div className="result-stats">
        <div className="stat-card">
          <div className="stat-value">{cgpa}</div>
          <div className="stat-label">SGPA</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalCredits}</div>
          <div className="stat-label">Total Credits</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{allRows.length}</div>
          <div className="stat-label">Subjects</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
        <table className="result-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th>Credits</th>
              <th>Marks</th>
              <th>Grade</th>
              <th>GP</th>
              <th>Weighted</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((s, i) => {
              const gs = getGradeStyle(s.grade);
              return (
                <tr key={s.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                  <td>
                    {s.name}
                    {s.isMinor && <span className="minor-badge" style={{ marginLeft: 8 }}>MINOR</span>}
                  </td>
                  <td>{s.credits}</td>
                  <td style={{ fontWeight: 700, fontFamily: 'Space Grotesk' }}>{s.marks}</td>
                  <td>
                    <span className="grade-chip" style={{ color: gs.color, background: gs.bg, borderColor: gs.border }}>
                      {s.grade}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{s.points}</td>
                  <td style={{ color: 'var(--accent-tertiary)', fontWeight: 600 }}>
                    {(s.points * s.credits).toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer">
        <span className="disclaimer-icon">⚠️</span>
        <div className="disclaimer-text">
          <strong>Disclaimer — You Are Using This On Your Own Will</strong>
          This is an estimated CGPA based on your entered marks only. Results may differ from your official records due to moderation, institutional policies, or other factors. You are using this calculator voluntarily and entirely at your own discretion. The developer holds no responsibility for any decisions made based on these results.
        </div>
      </div>
    </div>
  );
}
