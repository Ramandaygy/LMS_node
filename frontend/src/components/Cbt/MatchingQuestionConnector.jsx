import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';

const COLOR_PALETTE = [
  '#0284c7', // Sky Blue
  '#16a34a', // Emerald Green
  '#9333ea', // Purple
  '#ea580c', // Orange
  '#ec4899', // Pink
  '#0d9488', // Teal
  '#d97706', // Amber
  '#2563eb'  // Royal Blue
];

const MatchingQuestionConnector = ({
  matchingPairs = [],
  selectedPairs = [],
  onMatchChange
}) => {
  const containerRef = useRef(null);
  const leftRefs = useRef({});
  const rightRefs = useRef({});

  const [activeLeft, setActiveLeft] = useState(null);
  const [activeRight, setActiveRight] = useState(null);
  const [lines, setLines] = useState([]);

  // Normalize left premises and distinct right options
  const premises = useMemo(() => {
    return matchingPairs.map((p, idx) => ({
      id: `left_${idx}`,
      leftText: p.premise || p.left || '',
      defaultRightText: p.answer || p.right || '',
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
    }));
  }, [matchingPairs]);

  const options = useMemo(() => {
    const rawOptions = matchingPairs.map(p => p.answer || p.right || '').filter(Boolean);
    const uniqueOptions = Array.from(new Set(rawOptions)).sort();
    return uniqueOptions.map((optText, idx) => ({
      id: `right_${idx}`,
      rightText: optText
    }));
  }, [matchingPairs]);

  // Recalculate SVG Line positions
  const updateLines = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    const newLines = [];
    premises.forEach((pItem, pIdx) => {
      const matched = selectedPairs.find(sp => sp.left === pItem.leftText);
      if (!matched || !matched.right) return;

      const optIdx = options.findIndex(opt => opt.rightText === matched.right);
      if (optIdx === -1) return;

      const leftDotEl = leftRefs.current[pItem.id];
      const rightDotEl = rightRefs.current[options[optIdx].id];

      if (leftDotEl && rightDotEl) {
        const lRect = leftDotEl.getBoundingClientRect();
        const rRect = rightDotEl.getBoundingClientRect();

        const x1 = lRect.left + lRect.width / 2 - containerRect.left;
        const y1 = lRect.top + lRect.height / 2 - containerRect.top;
        const x2 = rRect.left + rRect.width / 2 - containerRect.left;
        const y2 = rRect.top + rRect.height / 2 - containerRect.top;

        newLines.push({
          key: `${pItem.leftText}___${matched.right}`,
          leftText: pItem.leftText,
          rightText: matched.right,
          x1,
          y1,
          x2,
          y2,
          color: pItem.color
        });
      }
    });

    setLines(newLines);
  };

  useLayoutEffect(() => {
    updateLines();
  }, [selectedPairs, premises, options]);

  useEffect(() => {
    const handleResize = () => updateLines();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(updateLines, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [selectedPairs, premises, options]);

  // Handle clicking left item
  const handleLeftClick = (leftText) => {
    if (activeRight) {
      // Connect activeRight to this leftText
      onMatchChange(leftText, activeRight);
      setActiveRight(null);
      setActiveLeft(null);
      return;
    }

    if (activeLeft === leftText) {
      setActiveLeft(null);
    } else {
      setActiveLeft(leftText);
    }
  };

  // Handle clicking right item
  const handleRightClick = (rightText) => {
    if (activeLeft) {
      // Connect activeLeft to this rightText
      onMatchChange(activeLeft, rightText);
      setActiveLeft(null);
      setActiveRight(null);
      return;
    }

    if (activeRight === rightText) {
      setActiveRight(null);
    } else {
      setActiveRight(rightText);
    }
  };

  // Remove match
  const handleRemoveMatch = (leftText) => {
    onMatchChange(leftText, '');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Instruction Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
        padding: '12px 18px',
        borderRadius: '12px',
        border: '1px solid #bae6fd',
        color: '#0369a1'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0284c7' }}>alt_route</span>
          <span>Klik item <strong>Premis (Kiri)</strong> lalu klik <strong>Jawaban (Kanan)</strong> untuk menarik garis penjodohan.</span>
        </div>
        {(selectedPairs.length > 0) && (
          <span style={{ fontSize: '12px', fontWeight: '800', background: '#0284c7', color: '#ffffff', padding: '3px 10px', borderRadius: '20px' }}>
            {selectedPairs.filter(p => p.right).length} dari {premises.length} Terpasang
          </span>
        )}
      </div>

      {/* Main Interactive Canvas Container */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1fr minmax(40px, 120px) 1fr',
          gap: '12px',
          background: '#ffffff',
          padding: '20px 14px',
          borderRadius: '16px',
          border: '1px solid #cbd5e1',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
          alignItems: 'start'
        }}
      >
        {/* SVG Canvas overlay for connecting lines */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
            overflow: 'visible'
          }}
        >
          <defs>
            {COLOR_PALETTE.map((col, i) => (
              <filter key={i} id={`glow-${i}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={col} floodOpacity="0.4" />
              </filter>
            ))}
          </defs>

          {lines.map((line, idx) => {
            const dx = Math.max(30, Math.abs(line.x2 - line.x1) / 3);
            const pathData = `M ${line.x1} ${line.y1} C ${line.x1 + dx} ${line.y1}, ${line.x2 - dx} ${line.y2}, ${line.x2} ${line.y2}`;
            const colorIdx = COLOR_PALETTE.indexOf(line.color);
            const filterId = colorIdx > -1 ? `url(#glow-${colorIdx})` : 'none';

            return (
              <g key={line.key}>
                {/* Outer shadow line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="5"
                  strokeOpacity="0.85"
                  filter={filterId}
                  strokeLinecap="round"
                />
                {/* Inner bright line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
                {/* Left Dot Circle */}
                <circle cx={line.x1} cy={line.y1} r="6" fill={line.color} stroke="#ffffff" strokeWidth="2" />
                {/* Right Dot Circle */}
                <circle cx={line.x2} cy={line.y2} r="6" fill={line.color} stroke="#ffffff" strokeWidth="2" />
              </g>
            );
          })}
        </svg>

        {/* LEFT COLUMN (PREMIS / PERTANYAAN) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 12 }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
            Premis / Pertanyaan (Kiri)
          </div>

          {premises.map((pItem, pIdx) => {
            const matched = selectedPairs.find(sp => sp.left === pItem.leftText);
            const isMatched = !!matched?.right;
            const isActive = activeLeft === pItem.leftText;

            return (
              <div
                key={pItem.id}
                onClick={() => handleLeftClick(pItem.leftText)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isActive ? '#f0f9ff' : isMatched ? '#f8fafc' : '#ffffff',
                  border: isActive
                    ? `2px solid ${pItem.color}`
                    : isMatched
                    ? `2px solid ${pItem.color}`
                    : '1px solid #cbd5e1',
                  boxShadow: isActive
                    ? `0 0 0 4px ${pItem.color}33`
                    : isMatched
                    ? `0 2px 6px ${pItem.color}22`
                    : '0 2px 4px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, paddingRight: '8px' }}>
                  <span style={{
                    background: pItem.color,
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '900',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    minWidth: '22px',
                    textAlign: 'center'
                  }}>
                    {pIdx + 1}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', lineHeight: '1.4' }}>
                    {pItem.leftText}
                  </span>
                </div>

                {isMatched ? (
                  <button
                    type="button"
                    title="Lepas sambungan garis"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMatch(pItem.leftText);
                    }}
                    style={{
                      border: 'none',
                      background: '#fee2e2',
                      color: '#dc2626',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    ×
                  </button>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: isActive ? pItem.color : '#94a3b8' }}>
                    {isActive ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                )}

                {/* Connector Anchor Dot on Right Edge */}
                <div
                  ref={el => leftRefs.current[pItem.id] = el}
                  style={{
                    position: 'absolute',
                    right: '-7px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: isMatched || isActive ? pItem.color : '#cbd5e1',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    zIndex: 15
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* MIDDLE SPACE WITH CONNECTING BADGES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', justifyContent: 'center', paddingTop: '32px', zIndex: 12 }}>
          {premises.map((pItem) => {
            const matched = selectedPairs.find(sp => sp.left === pItem.leftText);
            if (!matched?.right) {
              return <div key={pItem.id} style={{ height: '48px' }}></div>;
            }

            return (
              <div
                key={pItem.id}
                style={{
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center'
                }}
              >
                <span
                  title={`${pItem.leftText} → ${matched.right}`}
                  style={{
                    background: pItem.color,
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  &harr;
                </span>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN (PILIHAN JAWABAN) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 12 }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
            Pilihan Jawaban (Kanan)
          </div>

          {options.map((optItem, optIdx) => {
            const matchingLeftPremises = selectedPairs.filter(sp => sp.right === optItem.rightText);
            const isMatched = matchingLeftPremises.length > 0;
            const matchedColor = isMatched
              ? premises.find(p => p.leftText === matchingLeftPremises[0].left)?.color || '#0284c7'
              : null;
            const isActive = activeRight === optItem.rightText;

            return (
              <div
                key={optItem.id}
                onClick={() => handleRightClick(optItem.rightText)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isActive ? '#f0f9ff' : isMatched ? '#f8fafc' : '#ffffff',
                  border: isActive
                    ? `2px solid ${matchedColor || '#0284c7'}`
                    : isMatched
                    ? `2px solid ${matchedColor}`
                    : '1px solid #cbd5e1',
                  boxShadow: isActive
                    ? `0 0 0 4px ${matchedColor || '#0284c7'}33`
                    : isMatched
                    ? `0 2px 6px ${matchedColor}22`
                    : '0 2px 4px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  userSelect: 'none'
                }}
              >
                {/* Connector Anchor Dot on Left Edge */}
                <div
                  ref={el => rightRefs.current[optItem.id] = el}
                  style={{
                    position: 'absolute',
                    left: '-7px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: isMatched || isActive ? (matchedColor || '#0284c7') : '#cbd5e1',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 0 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    zIndex: 15
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, paddingLeft: '8px' }}>
                  <span style={{
                    background: isMatched ? matchedColor : '#e2e8f0',
                    color: isMatched ? '#ffffff' : '#475569',
                    fontSize: '11px',
                    fontWeight: '900',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    minWidth: '22px',
                    textAlign: 'center'
                  }}>
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', lineHeight: '1.4' }}>
                    {optItem.rightText}
                  </span>
                </div>

                {isMatched ? (
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: matchedColor }}>
                    check_circle
                  </span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: isActive ? '#0284c7' : '#94a3b8' }}>
                    {isActive ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MatchingQuestionConnector;
