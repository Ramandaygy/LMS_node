import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import '../../styles/components/forum-discussion.css';

const ForumDiscussion = ({ subjectId, materialId, currentUser }) => {
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // { discussionId, username }

  // New Topic Form State
  const [showNewTopicForm, setShowNewTopicForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submittingTopic, setSubmittingTopic] = useState(false);

  // Active Reply Input State: { [discussionId]: string }
  const [replyInputs, setReplyInputs] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);

  // Auto-clear success/error messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
        setSuccess('✅ Topik diskusi berhasil diterbitkan!');
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
        setReplyingTo(null);
        // Refresh semua diskusi untuk mendapatkan data terbaru
        fetchDiscussions();
      }
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Gagal mengirimkan balasan.');
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
        setSuccess('✅ Topik diskusi berhasil dihapus.');
        setDiscussions((prev) => prev.filter((d) => d._id !== discussionId));
      }
    } catch (err) {
      console.error('Error deleting discussion:', err);
      setError('Gagal menghapus topik diskusi.');
    }
  };

  const handleReplyClick = (discussionId, username) => {
    setReplyingTo({ discussionId, username });
    setReplyInputs((prev) => ({ 
      ...prev, 
      [discussionId]: `@${username} ` 
    }));
    // Focus input after state update
    setTimeout(() => {
      const input = document.querySelector(`#reply-input-${discussionId}`);
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 100);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return `${diff} detik lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
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
              (id) => id === currentUserId || id?._id === currentUserId
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
                        {item.author?.role === 'guru' ? '👨‍🏫 GURU' : '👨‍🎓 SISWA'}
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

                {/* Topic Actions - Instagram Style */}
                <div className="topic-actions">
                  <button
                    className={`btn-like ${hasLiked ? 'liked' : ''}`}
                    onClick={() => handleToggleLike(item._id)}
                  >
                    <span className="material-symbols-outlined">
                      {hasLiked ? 'favorite' : 'favorite_border'}
                    </span>
                    <span>{item.likes?.length || 0} Suka</span>
                  </button>

                  <div className="reply-count-badge">
                    <span className="material-symbols-outlined">chat_bubble_outline</span>
                    <span>{item.replies?.length || 0} Komentar</span>
                  </div>
                </div>

                {/* Replies Thread - Instagram Style */}
                <div className="replies-thread-section">
                  {item.replies && item.replies.length > 0 && (
                    <div className="replies-list">
                      {item.replies.map((reply, rIdx) => {
                        const rName = reply.author?.full_name || 'Pengguna';
                        const isReplyAuthor = reply.author?._id === currentUserId;
                        
                        return (
                          <div key={reply._id || rIdx} className="reply-item">
                            <div className="reply-avatar">
                              {reply.author?.profileImage ? (
                                <img src={reply.author.profileImage} alt="Avatar" />
                              ) : (
                                <span>{getInitials(rName)}</span>
                              )}
                            </div>

                            <div className="reply-content-box">
                              <div className="reply-author-row">
                                <strong>{rName}</strong>
                                <span className={`reply-role ${reply.author?.role === 'guru' ? 'guru' : 'siswa'}`}>
                                  {reply.author?.role === 'guru' ? 'GURU' : 'SISWA'}
                                </span>
                                {isReplyAuthor && (
                                  <span className="reply-you-badge">Anda</span>
                                )}
                              </div>
                              <p className="reply-text">{reply.content}</p>
                              
                              <div className="reply-sub-actions">
                                <span>{formatDate(reply.created_at)}</span>
                                <button
                                  type="button"
                                  className="btn-reply-to"
                                  onClick={() => handleReplyClick(item._id, rName)}
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

                  {/* Reply Input - Instagram Style */}
                  <div className="add-reply-box">
                    <input
                      id={`reply-input-${item._id}`}
                      type="text"
                      placeholder={replyingTo?.discussionId === item._id 
                        ? `Balas ke ${replyingTo.username}...` 
                        : `Tulis komentar...`}
                      value={replyInputs[item._id] || ''}
                      onChange={(e) =>
                        setReplyInputs({ ...replyInputs, [item._id]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddReply(item._id);
                        }
                      }}
                      className="reply-input-field"
                    />
                    <button
                      className="btn-send-reply"
                      disabled={submittingReplyId === item._id || !(replyInputs[item._id] || '').trim()}
                      onClick={() => handleAddReply(item._id)}
                    >
                      {submittingReplyId === item._id ? '...' : 'Kirim'}
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