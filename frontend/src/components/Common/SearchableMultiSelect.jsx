import React, { useState, useRef, useEffect } from 'react';
import './searchable-multi-select.css';

const SearchableMultiSelect = ({ options = [], value = [], onChange, placeholder = 'Cari dan pilih...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure value is array of strings
  const selectedValues = Array.isArray(value) ? value.map(v => typeof v === 'object' ? (v._id || v.id) : v) : [];

  const handleToggleOption = (optionValue) => {
    let newValue;
    if (selectedValues.includes(optionValue)) {
      newValue = selectedValues.filter(v => v !== optionValue);
    } else {
      newValue = [...selectedValues, optionValue];
    }
    onChange(newValue);
  };

  const handleRemoveBadge = (optionValue, e) => {
    e.stopPropagation();
    const newValue = selectedValues.filter(v => v !== optionValue);
    onChange(newValue);
  };

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedObjects = options.filter(opt => selectedValues.includes(opt.value));

  return (
    <div className="searchable-multi-select-container" ref={containerRef}>
      <div 
        className={`searchable-multi-select-trigger ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="selected-badges">
          {selectedObjects.length === 0 ? (
            <span className="placeholder-text">{placeholder}</span>
          ) : (
            selectedObjects.map(opt => (
              <span key={opt.value} className="select-badge">
                {opt.label}
                <span 
                  className="material-symbols-outlined remove-icon" 
                  onClick={(e) => handleRemoveBadge(opt.value, e)}
                >
                  close
                </span>
              </span>
            ))
          )}
        </div>
        <span className="material-symbols-outlined dropdown-arrow">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </div>

      {isOpen && (
        <div className="searchable-multi-select-dropdown">
          <div className="search-box">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              type="text"
              className="search-input"
              placeholder="Cari..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            {search && (
              <span className="material-symbols-outlined clear-icon" onClick={() => setSearch('')}>
                close
              </span>
            )}
          </div>
          <div className="options-list">
            {filteredOptions.length === 0 ? (
              <div className="no-options">Tidak ada data ditemukan</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    className={`option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleOption(opt.value)}
                  >
                    <div className="checkbox-box">
                      {isSelected && <span className="material-symbols-outlined check-icon">check</span>}
                    </div>
                    <div className="option-text">
                      <span className="option-label">{opt.label}</span>
                      {opt.sublabel && <span className="option-sublabel">{opt.sublabel}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableMultiSelect;
