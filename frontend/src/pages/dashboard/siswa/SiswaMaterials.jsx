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
        <div className="empty-detail">
          <span className="material-symbols-outlined">menu_book</span>
          <p>Pilih materi dari daftar untuk mulai belajar</p>
        </div>
      );
    }

    const type = getMaterialType(selectedMaterial);
    const progress = selectedMaterial.progress || {};
    const isCompleted = progress.completed;

    return (
      <div className="detail-card">
        <div className="detail-header">
          <div className="title-section">
            <h2>{selectedMaterial.title}</h2>
            <span className={`status-chip ${isCompleted ? 'completed' : 'in-progress'}`}>
              {isCompleted ? 'Selesai' : `${progress.progress_percent || 0}%`}
            </span>
          </div>
          <div className="meta-grid">
            <div className="meta-item">
              <span className="material-symbols-outlined">school</span>
              <div>
                <span className="label">Kelas</span>
                <span className="value">{selectedMaterial.class_name}</span>
              </div>
            </div>
            <div className="meta-item">
              <span className="material-symbols-outlined">menu_book</span>
              <div>
                <span className="label">Mapel</span>
                <span className="value">{selectedMaterial.subject_name}</span>
              </div>
            </div>
            <div className="meta-item">
              <span className="material-symbols-outlined">person</span>
              <div>
                <span className="label">Guru</span>
                <span className="value">{selectedMaterial.teacher_name}</span>
              </div>
            </div>
          </div>
          {selectedMaterial.description && (
            <p className="material-desc">{selectedMaterial.description}</p>
          )}
        </div>

        <div className="progress-bar-wrap">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress.progress_percent || 0}%` }} />
          </div>
          <span className="progress-label">{progress.progress_percent || 0}% selesai</span>
        </div>

        <div className="viewer-content">
          {type === 'slides' && slides.length > 0 && (
            <div className="slide-viewer">
              <div className="slide-counter">
                Slide {currentSlide + 1} dari {slides.length}
              </div>
              <div
                className="slide-body"
                dangerouslySetInnerHTML={{ __html: slides[currentSlide] }}
              />
              <div className="slide-nav">
                <button
                  type="button"
                  disabled={currentSlide === 0 || saving}
                  onClick={() => handleSlideChange(currentSlide - 1)}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                  Sebelumnya
                </button>
                {currentSlide < slides.length - 1 ? (
                  <button
                    type="button"
                    className="btn-next"
                    disabled={saving}
                    onClick={() => handleSlideChange(currentSlide + 1)}
                  >
                    Selanjutnya
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-complete"
                    disabled={saving || isCompleted}
                    onClick={handleCompleteSlides}
                  >
                    {isCompleted ? 'Materi Selesai' : 'Tandai Selesai'}
                  </button>
                )}
              </div>
            </div>
          )}

          {type === 'video' && (
            <div className="video-viewer">
              <iframe
                title={selectedMaterial.title}
                src={getYoutubeEmbed(selectedMaterial.external_link)}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <p className="video-hint">
                Tonton video sampai selesai. Progress otomatis tercatat setelah video berakhir.
              </p>
              {!isCompleted && (
                <button
                  type="button"
                  className="btn-complete"
                  disabled={!videoReady || saving}
                  onClick={handleCompleteVideo}
                >
                  {videoReady ? 'Tandai Selesai Menonton' : 'Tunggu video selesai (min. 15 detik)...'}
                </button>
              )}
            </div>
          )}

          {type === 'video-file' && (
            <div className="video-viewer">
              <video
                ref={videoRef}
                controls
                className="native-video"
                src={`${baseURL}${selectedMaterial.file_url}`}
                onEnded={handleVideoEnded}
              />
              {!isCompleted && (
                <button
                  type="button"
                  className="btn-complete"
                  disabled={!videoReady || saving}
                  onClick={handleCompleteVideo}
                >
                  Tandai Selesai Menonton
                </button>
              )}
            </div>
          )}

          {(type === 'file' || type === 'link') && (
            <div className="file-viewer">
              {selectedMaterial.file_url && (
                <div className="preview-block">
                  {selectedMaterial.file_url.match(/\.(png|jpe?g|gif|svg)$/i) ? (
                    <img
                      src={`${baseURL}${selectedMaterial.file_url}`}
                      alt={selectedMaterial.title}
                      className="preview-image"
                      onLoad={() => setPreviewReady(true)}
                    />
                  ) : (
                    <iframe
                      title={selectedMaterial.title}
                      src={`${baseURL}${selectedMaterial.file_url}`}
                      className="preview-iframe"
                      onLoad={() => setPreviewReady(true)}
                    />
                  )}
                </div>
              )}

              {selectedMaterial.external_link && (
                <div className="preview-block">
                  <iframe
                    title={selectedMaterial.title}
                    src={selectedMaterial.external_link}
                    className="preview-iframe"
                    onLoad={() => setPreviewReady(true)}
                  />
                </div>
              )}

              <div className="preview-note">
                Materi ditampilkan langsung di sini. Jika pratinjau tidak muncul, coba buka tautan di tab baru.
              </div>
              {(selectedMaterial.file_url || selectedMaterial.external_link) && (
                <a
                  href={selectedMaterial.external_link || `${baseURL}${selectedMaterial.file_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-link"
                >
                  <span className="material-symbols-outlined">open_in_new</span>
                  Buka di Tab Baru
                </a>
              )}

              {!isCompleted && (
                <button
                  type="button"
                  className="btn-complete"
                  disabled={saving || !previewReady}
                  onClick={handleCompleteFile}
                >
                  {previewReady ? 'Tandai Selesai' : 'Tunggu pratinjau aktif...'}
                </button>
              )}
            </div>
          )}

          {type === 'empty' && (
            <div className="empty-content">
              <p>Materi ini belum memiliki konten.</p>
            </div>
          )}
        </div>

        {isCompleted && progress.completed_at && (
          <div className="completion-banner">
            <span className="material-symbols-outlined">check_circle</span>
            Diselesaikan pada {new Date(progress.completed_at).toLocaleString('id-ID')}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="loading">Memuat materi...</div>;

  return (
    <div className="siswa-materials-container">
      <div className="page-header">
        <h1>Materi Pembelajaran</h1>
        <p>Selesaikan setiap materi (slide/video) agar progress tercatat untuk monitoring guru</p>
      </div>

      <div className="materials-grid">
        <div className="materials-list-panel">
          <h3 className="list-title">
            Daftar Materi
            <span className="count-badge">{materials.length}</span>
          </h3>
          {materials.length === 0 ? (
            <div className="empty">Belum ada materi untuk kelas Anda</div>
          ) : (
            materials.map(m => (
              <div
                key={m._id}
                className={`material-list-card ${selectedMaterial?._id === m._id ? 'selected' : ''}`}
                onClick={() => handleSelectMaterial(m)}
              >
                <div className="card-header">
                  <div className="card-icon">
                    <span className="material-symbols-outlined">
                      {getMaterialType(m) === 'video' || getMaterialType(m) === 'video-file' ? 'play_circle' : 'article'}
                    </span>
                  </div>
                  <div className="card-info">
                    <h4>{m.title}</h4>
                    <div className="meta">{m.subject_name} • {m.class_name}</div>
                  </div>
                  <span className={`progress-badge ${m.progress?.completed ? 'done' : ''}`}>
                    {m.progress?.completed ? 'Selesai' : `${m.progress?.progress_percent || 0}%`}
                  </span>
                </div>
                <div className="mini-progress">
                  <div
                    className="mini-progress-fill"
                    style={{ width: `${m.progress?.progress_percent || 0}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="material-detail-panel">
          {renderMaterialViewer()}
        </div>
      </div>
    </div>
  );
};

export default SiswaMaterials;
