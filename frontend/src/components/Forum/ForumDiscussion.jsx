import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/components/forum-discussion.css';

const ForumDiscussion = ({ subjectId, materialId, currentUser }) => {
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New Topic Form State
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submittingTopic, setSubmittingTopic] = useState(false);

  // Active Reply Input State: { [discussionId]: string }
  const [replyInputs, setReplyInputs] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);

  useEffect(() => {
    if (subjectId || materialId) {
      fetchDiscussions();
    }
  }, [subjectId, materialId]);

  const fetchDiscussions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (materialId) params.materialId = materialId;
      else if (subjectId) params.subjectId = subjectId;

      const res = await api.get('/forum/discussions', { params });
      if (res.data.success) {
        setDiscussions(res.data.discussions || []);
      }
    } catch (err) {
      console.error('Error fetching discussions:', err);
      setError('Gagal memuat forum diskusi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setError('Judul dan isi pertanyaan wajib diisi.');
      return;
    }

    try {
      setSubmittingTopic(true);
      setError('');

      const res = await api.post('/forum/discussions', {
        subjectId,
        materialId: materialId || null,
        title: newTitle,
        content: newContent
      });

      if (res.data.success) {
        setSuccess('Topik diskusi berhasil diterbitkan.');
        setNewTitle('');
        setNewContent('');
        setShowNewTopicForm(false);
        fetchDiscussions();
      }
    } catch (err) {
      console.error('Error creating topic:', err);
      setError(err.response?.data?.message || 'Gagal memuat topik diskusi.');
    } finally {
      setSubmittingTopic(false);
    }
  };

  const handleAddReply = async (discussionId) => {
    const text = replyInputs[discussionId] || '';
    if (!text.trim()) return;

    try {
      setSubmittingReplyId(discussionId);
      const res = await api.post(`/forum/discussions/${discussionId}/reply`, {
        content: text
      });

      if (res.data.success) {
        setReplyInputs((prev) => ({ ...prev, [discussionId]: '' }));
        setDiscussions((prev) =>
          prev.map((d) => (d._id === discussionId ? res.data.discussion : d))
        );
      }
    } catch (err) {
      console.error('Error adding reply:', err);
      alert('Gagal mengirimkan balasan.');
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const handleToggleLike = async (discussionId) => {
    try {
      const res = await api.post(`/forum/discussions/${discussionId}/like`);
      if (res.data.success) {
        setDiscussions((prev) =>
          prev.map((d) => {
            if (d._id === discussionId) {
              return { ...d, likes: res.data.likes };
            }
            return d;
          })
        );
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleDeleteDiscussion = async (discussionId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus topik diskusi ini?')) return;
    try {
      const res = await api.delete(`/forum/discussions/${discussionId}`);
      if (res.data.success) {
        setDiscussions((prev) => prev.filter((d) => d._id !== discussionId));
      }
    } catch (err) {
      console.error('Error deleting discussion:', err);
      alert('Gagal menghapus topik diskusi.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return <div className="forum-loading">Memuat Forum Diskusi...</div>;
  }

  return (
    <div className="forum-discussion-wrapper">
      {/* Forum Header Bar */}
      <div className="forum-header-bar">
        <div className="forum-title-group">
          <span className="material-symbols-outlined forum-icon">forum</span>
          <div>
            <h3>Forum Diskusi & Tanya Jawab</h3>
            <p>Ruang diskusi interaktif antara siswa dan guru untuk pembahasan materi pembelajaran.</p>
          </div>
        </div>

        <button
          className="btn-new-topic"
          onClick={() => setShowNewTopicForm(!showNewTopicForm)}
        >
          <span className="material-symbols-outlined">
            {showNewTopicForm ? 'close' : 'rate_review'}
          </span>
          {showNewTopicForm ? 'Batal' : 'Buat Topik Diskusi'}
        </button>
      </div>

      {error && <div className="forum-alert error">{error}</div>}
      {success && <div className="forum-alert success">{success}</div>}

      {/* Form New Topic */}
      {showNewTopicForm && (
        <form onSubmit={handleCreateTopic} className="new-topic-form-card">
          <h4>Tulis Topik Pertanyaan / Diskusi Baru</h4>

          <div className="form-group">
            <label>Judul Topik Diskusi *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Pertanyaan mengenai konsep dasar pada Bab 2"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="forum-input"
            />
          </div>

          <div className="form-group">
            <label>Isi Pertanyaan / Penjelasan *</label>
            <textarea
              rows="3"
              required
              placeholder="Jelaskan pertanyaan atau topik bahasan Anda secara detail di sini..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="forum-textarea"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => setShowNewTopicForm(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submittingTopic}
              className="btn-submit-topic"
            >
              {submittingTopic ? 'Menerbitkan...' : 'Terbitkan Diskusi'}
            </button>
          </div>
        </form>
      )}

      {/* List of Discussions */}
      <div className="discussions-list">
        {discussions.length > 0 ? (
          discussions.map((item) => {
            const currentUserId = currentUser?._id || localStorage.getItem('userId');
            const hasLiked = item.likes?.some(
              (id) => id === currentUserId || id._id === currentUserId
            );
            const isAuthor =
              item.author?._id === currentUserId ||
              currentUser?.role === 'guru' ||
              currentUser?.role === 'admin';

            return (
              <div key={item._id} className="discussion-card">
                {/* Topic Author Header */}
                <div className="topic-header">
                  <div className="author-avatar">
                    {item.author?.profileImage ? (
                      <img src={item.author.profileImage} alt="Avatar" />
                    ) : (
                      <span>{getInitials(item.author?.full_name)}</span>
                    )}
                  </div>

                  <div className="author-meta">
                    <div className="author-name-row">
                      <span className="author-name">{item.author?.full_name || 'Pengguna'}</span>
                      <span className={`role-pill ${item.author?.role || 'siswa'}`}>
                        {item.author?.role === 'guru' ? 'GURU PENGAMPU' : 'SISWA'}
                      </span>
                    </div>
                    <span className="topic-time">{formatDate(item.createdAt)}</span>
                  </div>

                  {isAuthor && (
                    <button
                      className="btn-delete-topic"
                      title="Hapus Topik Diskusi"
                      onClick={() => handleDeleteDiscussion(item._id)}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                </div>

                {/* Topic Body */}
                <div className="topic-body">
                  <h4 className="topic-title">{item.title}</h4>
                  <p className="topic-content">{item.content}</p>
                </div>

                {/* Topic Actions (Instagram Style Like & Reply Count) */}
                <div className="topic-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', margin: '12px 0' }}>
                  <button
                    className={`btn-like ${hasLiked ? 'liked' : ''}`}
                    onClick={() => handleToggleLike(item._id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: hasLiked ? '#ed4956' : '#64748b', fontWeight: '700', fontSize: '13px' }}
                  >
                    <span className="material-symbols-outlined" style={{ color: hasLiked ? '#ed4956' : '#64748b', fontSize: '20px' }}>
                      {hasLiked ? 'favorite' : 'favorite_border'}
                    </span>
                    <span>{item.likes?.length || 0} Suka</span>
                  </button>

                  <div className="reply-count-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat_bubble_outline</span>
                    <span>{item.replies?.length || 0} Komentar</span>
                  </div>
                </div>

                {/* Instagram Style Replies Thread Section */}
                <div className="replies-thread-section" style={{ padding: '0 8px' }}>
                  {item.replies && item.replies.length > 0 && (
                    <div className="replies-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
                      {item.replies.map((reply, rIdx) => {
                        const rName = reply.author?.full_name || 'Pengguna';
                        return (
                          <div key={reply._id || rIdx} className="reply-item" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <div className="reply-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px', flexShrink: 0 }}>
                              {reply.author?.profileImage ? (
                                <img src={reply.author.profileImage} alt="Avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <span>{getInitials(rName)}</span>
                              )}
                            </div>

                            <div className="reply-content-box" style={{ flex: 1, background: '#f8fafc', padding: '10px 14px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                              <div className="reply-author-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                <strong style={{ fontSize: '12px', color: '#0f172a', fontWeight: '800' }}>{rName}</strong>
                                <span style={{ fontSize: '10px', background: reply.author?.role === 'guru' ? '#e0f2fe' : '#f1f5f9', color: reply.author?.role === 'guru' ? '#0284c7' : '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                                  {reply.author?.role === 'guru' ? 'GURU' : 'SISWA'}
                                </span>
                              </div>
                              <p style={{ fontSize: '13px', color: '#334155', margin: '2px 0 6px 0', lineHeight: '1.4' }}>{reply.content}</p>
                              
                              {/* Instagram Comment Sub-Action Row */}
                              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>
                                <span>{formatDate(reply.created_at)}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyInputs({ ...replyInputs, [item._id]: `@${rName} ` });
                                  }}
                                  style={{ background: 'none', border: 'none', padding: 0, color: '#0284c7', fontWeight: '800', cursor: 'pointer', fontSize: '11px' }}
                                >
                                  Balas
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Instagram Style Reply Input Box */}
                  <div className="add-reply-box" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                    <input
                      type="text"
                      placeholder={`Balas komentar sebagai ${currentUser?.full_name || 'Pengguna'}...`}
                      value={replyInputs[item._id] || ''}
                      onChange={(e) =>
                        setReplyInputs({ ...replyInputs, [item._id]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddReply(item._id);
                      }}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                    />
                    <button
                      className="btn-send-reply"
                      disabled={submittingReplyId === item._id}
                      onClick={() => handleAddReply(item._id)}
                      style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>Kirim</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="forum-empty-state">
            <span className="material-symbols-outlined empty-icon">chat</span>
            <h4>Belum Ada Diskusi</h4>
            <p>Jadilah yang pertama untuk membuat topik diskusi atau mengajukan pertanyaan pada mata pelajaran ini.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumDiscussion;
