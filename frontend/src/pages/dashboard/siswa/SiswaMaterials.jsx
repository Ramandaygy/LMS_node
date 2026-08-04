import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/siswa/siswa-materials.css';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const isYoutube = (url) => /youtube\.com|youtu\.be/i.test(url || '');

const getYoutubeEmbed = (url) => {
  const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};

const isVideoFile = (url) => /\.(mp4|webm|ogg)(\?|$)/i.test(url || '');

const parseSlides = (content) => {
  if (!content?.trim()) return [];
  const bySlideBreak = content.split(/<!--\s*slide-break\s*-->/i).map(s => s.trim()).filter(Boolean);
  if (bySlideBreak.length > 1) return bySlideBreak;
  const bySlideDivs = content.match(/<div class="material-slide">[\s\S]*?<\/div>/gi);
  if (bySlideDivs && bySlideDivs.length > 1) return bySlideDivs;
  const byHr = content.split(/<hr\s*\/?>/i).map(s => s.trim()).filter(Boolean);
  if (byHr.length > 1) return byHr;
  const byDelimiter = content.split(/<!--\s*slide\s*-->/i).map(s => s.trim()).filter(Boolean);
  if (byDelimiter.length > 1) return byDelimiter;
  const byH2 = content.split(/(?=<h2)/i).map(s => s.trim()).filter(Boolean);
  if (byH2.length > 1) return byH2;
  return [content];
};

const getMaterialType = (material) => {
  if (material.external_link && isYoutube(material.external_link)) return 'video';
  if (material.external_link) return 'link';
  if (material.file_url && isVideoFile(material.file_url)) return 'video-file';
  if (material.content?.trim()) return 'slides';
  if (material.file_url) return 'file';
  return 'empty';
};

const SiswaMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const [saving, setSaving] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const videoRef = useRef(null);
  const videoTimerRef = useRef(null);
  const previewTimerRef = useRef(null);
  const slideContainerRef = useRef(null);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await api.get('/materials/siswa/me');
      setMaterials(res.data.data || []);
    } catch (err) {
      console.error('Gagal ambil materi', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    return () => {
      if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const saveProgress = async (materialId, payload) => {
    setSaving(true);
    try {
      await api.post(`/materials/${materialId}/progress`, payload);
      setMaterials(prev => prev.map(m => {
        if (m._id !== materialId) return m;
        return {
          ...m,
          progress: {
            ...m.progress,
            ...payload,
            completed_at: payload.completed ? new Date().toISOString() : m.progress?.completed_at
          }
        };
      }));
      if (selectedMaterial?._id === materialId) {
        setSelectedMaterial(prev => ({
          ...prev,
          progress: { ...prev.progress, ...payload }
        }));
      }
    } catch (err) {
      console.error('Gagal simpan progress', err);
      alert(err.response?.data?.message || 'Gagal menyimpan progress');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectMaterial = (material) => {
    const type = getMaterialType(material);
    const parsedSlides = type === 'slides' ? parseSlides(material.content) : [];
    const resumeSlide = material.progress?.current_slide || 0;
    const safeSlide = Math.min(resumeSlide, Math.max(parsedSlides.length - 1, 0));

    setSelectedMaterial(material);
    setSlides(parsedSlides);
    setCurrentSlide(safeSlide);
    setVideoReady(false);
    setPreviewReady(false);

    if (videoTimerRef.current) clearTimeout(videoTimerRef.current);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);

    if (type === 'video' || type === 'video-file') {
      videoTimerRef.current = setTimeout(() => setVideoReady(true), 15000);
    }

    if (type === 'file' || type === 'link') {
      previewTimerRef.current = setTimeout(() => setPreviewReady(true), 8000);
    }
  };

  const handleSlideChange = async (newIndex) => {
    if (!selectedMaterial || newIndex < 0 || newIndex >= slides.length) return;
    setCurrentSlide(newIndex);
    const progressPercent = Math.round(((newIndex + 1) / slides.length) * 100);
    const isLast = newIndex === slides.length - 1;

    await saveProgress(selectedMaterial._id, {
      current_slide: newIndex,
      total_slides: slides.length,
      progress_percent: progressPercent,
      completed: isLast
    });
  };

  const handleCompleteSlides = async () => {
    if (!selectedMaterial) return;
    await saveProgress(selectedMaterial._id, {
      current_slide: slides.length - 1,
      total_slides: slides.length,
      progress_percent: 100,
      completed: true
    });
  };

  const handleCompleteVideo = async () => {
    if (!selectedMaterial || !videoReady) return;
    await saveProgress(selectedMaterial._id, {
      progress_percent: 100,
      completed: true,
      total_slides: 1,
      current_slide: 0
    });
  };

  const handleVideoEnded = async () => {
    setVideoReady(true);
    if (selectedMaterial && !selectedMaterial.progress?.completed) {
      await saveProgress(selectedMaterial._id, {
        progress_percent: 100,
        completed: true,
        total_slides: 1,
        current_slide: 0
      });
    }
  };

  const handleCompleteFile = async () => {
    if (!selectedMaterial) return;
    await saveProgress(selectedMaterial._id, {
      progress_percent: 100,
      completed: true,
      total_slides: 1,
      current_slide: 0
    });
  };

  const renderMaterialViewer = () => {
    if (!selectedMaterial) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#94a3b8'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>menu_book</span>
          <p style={{ marginTop: '16px', fontSize: '16px' }}>Pilih materi dari daftar untuk mulai belajar</p>
        </div>
      );
    }

    const type = getMaterialType(selectedMaterial);
    const progress = selectedMaterial.progress || {};
    const isCompleted = progress.completed;

    // SLIDES
    if (type === 'slides' && slides.length > 0) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          gap: '12px'
        }}>
          {/* Header Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            flexShrink: 0
          }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
                {selectedMaterial.title}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {selectedMaterial.subject_name} • {selectedMaterial.class_name} • {selectedMaterial.teacher_name}
              </div>
            </div>
            <span style={{
              background: isCompleted ? '#dcfce7' : '#fef9c3',
              color: isCompleted ? '#15803d' : '#a16207',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '700'
            }}>
              {isCompleted ? '✅ Selesai' : `${progress.progress_percent || 0}%`}
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              <span>Progress Belajar</span>
              <span>{progress.progress_percent || 0}%</span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progress.progress_percent || 0}%`, height: '100%', background: '#0284c7', borderRadius: '4px' }} />
            </div>
          </div>

          {/* Slide Counter */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '6px 12px',
            background: '#f1f5f9',
            borderRadius: '8px',
            flexShrink: 0
          }}>
            <span style={{ fontWeight: '700', fontSize: '13px', color: '#475569' }}>
              Slide {currentSlide + 1} dari {slides.length}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {Math.round(((currentSlide + 1) / slides.length) * 100)}% selesai
            </span>
          </div>

          {/* Slide Body - BISA DI-SCROLL */}
          <div
            ref={slideContainerRef}
            style={{
              flex: 1,
              background: '#ffffff',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              overflowY: 'auto',
              minHeight: '200px',
              maxHeight: '100%',
              fontSize: '16px',
              lineHeight: '1.8'
            }}
            dangerouslySetInnerHTML={{ __html: slides[currentSlide] }}
          />

          {/* Tombol Navigasi - TETAP TERLIHAT */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
            paddingTop: '4px'
          }}>
            <button
              type="button"
              disabled={currentSlide === 0 || saving}
              onClick={() => handleSlideChange(currentSlide - 1)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: currentSlide === 0 ? '#f1f5f9' : '#ffffff',
                color: currentSlide === 0 ? '#94a3b8' : '#0f172a',
                fontWeight: '700',
                fontSize: '13px',
                cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '120px',
                justifyContent: 'center'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
              Sebelumnya
            </button>
            {currentSlide < slides.length - 1 ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSlideChange(currentSlide + 1)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '120px',
                  justifyContent: 'center'
                }}
              >
                Selanjutnya
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || isCompleted}
                onClick={handleCompleteSlides}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isCompleted ? '#22c55e' : '#22c55e',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: isCompleted ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '120px',
                  justifyContent: 'center'
                }}
              >
                {isCompleted ? '✅ Selesai' : '📌 Tandai Selesai'}
              </button>
            )}
          </div>
        </div>
      );
    }

    // VIDEO
    if (type === 'video' || type === 'video-file') {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            flexShrink: 0
          }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
                {selectedMaterial.title}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {selectedMaterial.subject_name} • {selectedMaterial.class_name} • {selectedMaterial.teacher_name}
              </div>
            </div>
            <span style={{
              background: isCompleted ? '#dcfce7' : '#fef9c3',
              color: isCompleted ? '#15803d' : '#a16207',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '700'
            }}>
              {isCompleted ? '✅ Selesai' : `${progress.progress_percent || 0}%`}
            </span>
          </div>

          <div style={{ flex: 1, position: 'relative', background: '#0f172a', borderRadius: '12px', overflow: 'hidden', minHeight: '300px' }}>
            {type === 'video' ? (
              <iframe
                title={selectedMaterial.title}
                src={getYoutubeEmbed(selectedMaterial.external_link)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
              />
            ) : (
              <video
                ref={videoRef}
                controls
                src={selectedMaterial.file_url.startsWith('http') ? selectedMaterial.file_url : `${baseURL}${selectedMaterial.file_url}`}
                onEnded={handleVideoEnded}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            )}
          </div>

          <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', flexShrink: 0 }}>
            Tonton video sampai selesai. Progress otomatis tercatat setelah video berakhir.
          </p>
          {!isCompleted && (
            <button
              type="button"
              disabled={!videoReady || saving}
              onClick={handleCompleteVideo}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: videoReady ? '#22c55e' : '#94a3b8',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '14px',
                cursor: videoReady ? 'pointer' : 'default',
                flexShrink: 0
              }}
            >
              {videoReady ? '✅ Tandai Selesai Menonton' : '⏳ Tunggu video selesai (min. 15 detik)...'}
            </button>
          )}
        </div>
      );
    }

    // FILE / LINK
    if (type === 'file' || type === 'link') {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            flexShrink: 0
          }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: '#0f172a' }}>
                {selectedMaterial.title}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {selectedMaterial.subject_name} • {selectedMaterial.class_name} • {selectedMaterial.teacher_name}
              </div>
            </div>
            <span style={{
              background: isCompleted ? '#dcfce7' : '#fef9c3',
              color: isCompleted ? '#15803d' : '#a16207',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '700'
            }}>
              {isCompleted ? '✅ Selesai' : `${progress.progress_percent || 0}%`}
            </span>
          </div>

          <div style={{ 
            flex: 1,
            background: '#f8fafc', 
            borderRadius: '12px', 
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            overflow: 'auto'
          }}>
            {selectedMaterial.file_url && (
              <div style={{ width: '100%' }}>
                {selectedMaterial.file_url.match(/\.(png|jpe?g|gif|svg)$/i) ? (
                  <img
                    src={selectedMaterial.file_url.startsWith('http') ? selectedMaterial.file_url : `${baseURL}${selectedMaterial.file_url}`}
                    alt={selectedMaterial.title}
                    onLoad={() => setPreviewReady(true)}
                    style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px' }}
                  />
                ) : (
                  <iframe
                    title={selectedMaterial.title}
                    src={
                      selectedMaterial.file_url.startsWith('http') && selectedMaterial.file_url.match(/\.(pdf|doc|docx|ppt|pptx|xls|xlsx)$/i)
                        ? `https://docs.google.com/gview?url=${encodeURIComponent(selectedMaterial.file_url)}&embedded=true`
                        : (selectedMaterial.file_url.startsWith('http') ? selectedMaterial.file_url : `${baseURL}${selectedMaterial.file_url}`)
                    }
                    onLoad={() => setPreviewReady(true)}
                    style={{ width: '100%', height: '400px', border: 'none', borderRadius: '8px' }}
                  />
                )}
              </div>
            )}

            {selectedMaterial.external_link && (
              <div style={{ width: '100%' }}>
                <iframe
                  title={selectedMaterial.title}
                  src={selectedMaterial.external_link}
                  onLoad={() => setPreviewReady(true)}
                  style={{ width: '100%', height: '400px', border: 'none', borderRadius: '8px' }}
                />
              </div>
            )}

            <div style={{ marginTop: '12px', color: '#94a3b8', fontSize: '13px' }}>
              Materi ditampilkan langsung di sini. Jika pratinjau tidak muncul, buka di tab baru.
            </div>
            {(selectedMaterial.file_url || selectedMaterial.external_link) && (
              <a
                href={selectedMaterial.external_link || (selectedMaterial.file_url?.startsWith('http') ? selectedMaterial.file_url : `${baseURL}${selectedMaterial.file_url}`)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#0284c7',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '13px'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                Buka di Tab Baru
              </a>
            )}
          </div>

          {!isCompleted && (
            <button
              type="button"
              disabled={saving || !previewReady}
              onClick={handleCompleteFile}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: previewReady ? '#22c55e' : '#94a3b8',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '14px',
                cursor: previewReady ? 'pointer' : 'default',
                flexShrink: 0
              }}
            >
              {previewReady ? '✅ Tandai Selesai' : '⏳ Tunggu pratinjau aktif...'}
            </button>
          )}
        </div>
      );
    }

    // EMPTY
    return (
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#94a3b8'
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1' }}>block</span>
        <p style={{ marginTop: '12px', fontSize: '15px' }}>Materi ini belum memiliki konten.</p>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#0284c7' }}>Memuat materi...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>📚 Materi Pembelajaran</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Selesaikan setiap materi agar progress tercatat untuk monitoring guru</p>
      </div>

      <div>
        {materials.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Belum ada materi untuk kelas Anda</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {materials.map(m => (
              <div
                key={m._id}
                onClick={() => handleSelectMaterial(m)}
                style={{ 
                  background: '#ffffff', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '16px', 
                  padding: '20px', 
                  cursor: 'pointer', 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.04)', 
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#0284c7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ 
                    background: '#eff6ff', 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flexShrink: 0 
                  }}>
                    <span className="material-symbols-outlined" style={{ color: '#3b82f6', fontSize: '24px' }}>
                      {getMaterialType(m) === 'video' || getMaterialType(m) === 'video-file' ? 'play_circle' : 'article'}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{m.title}</h4>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                      {m.subject_name} • {m.teacher_name || 'Guru'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '12px', fontWeight: '700' }}>
                  <span style={{ color: '#64748b' }}>Progress:</span>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    fontSize: '11px', 
                    background: m.progress?.completed ? '#dcfce7' : '#fef9c3', 
                    color: m.progress?.completed ? '#15803d' : '#a16207' 
                  }}>
                    {m.progress?.completed ? '✅ Selesai' : `${m.progress?.progress_percent || 0}%`}
                  </span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${m.progress?.progress_percent || 0}%`, height: '100%', background: '#3b82f6' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL MATERI */}
      {selectedMaterial && (
        <div 
          onClick={() => setSelectedMaterial(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              width: '100%', 
              maxWidth: '1100px', 
              height: '88vh',
              display: 'flex', 
              flexDirection: 'column',
              background: '#ffffff',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)'
            }}
          >
            {/* MODAL HEADER */}
            <div style={{
              padding: '12px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              background: '#f8fafc'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  {selectedMaterial.title}
                </h2>
                <div style={{ display: 'flex', gap: '8px', color: '#64748b', fontSize: '12px', marginTop: '2px', fontWeight: '600', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: '#e2e8f0', padding: '1px 10px', borderRadius: '4px' }}>{selectedMaterial.subject_name}</span>
                  <span>•</span>
                  <span style={{ background: '#e2e8f0', padding: '1px 10px', borderRadius: '4px' }}>{selectedMaterial.class_name}</span>
                  <span>•</span>
                  <span style={{ background: '#e2e8f0', padding: '1px 10px', borderRadius: '4px' }}>{selectedMaterial.teacher_name}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMaterial(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#64748b' }}>close</span>
              </button>
            </div>

            {/* MODAL BODY */}
            <div style={{
              flex: 1,
              overflow: 'hidden',
              padding: '20px 24px',
              background: '#ffffff'
            }}>
              {renderMaterialViewer()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiswaMaterials;