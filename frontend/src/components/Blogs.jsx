import React, { useState, useMemo } from "react";
import "../styles/Blogs.css";

/* Small inline icons */
const TrophyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M7 4h10v2a4 4 0 0 1-4 4H11A4 4 0 0 1 7 6V4z" fill="#F6C84C"/>
    <path d="M7 4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V5a1 1 0 0 0-1-1H7z" fill="#F59E0B" opacity="0.8"/>
  </svg>
);

const Avatar = ({ src, name }) => {
  if (src) return <img src={src} alt={name} className="avatar" />;
  return (
    <div className="avatar avatar-placeholder" title={name || "User"}>
      <span>{(name && name[0]) || "U"}</span>
    </div>
  );
};

const initialFeed = [
  { id: 1, type: "contest", when: "in 6 days", title: "Biweekly Contest 167", linkText: "Biweekly Contest 167", desc: "", category: "Contest", authorName: "LeetCode", authorIcon: null, views: 280 },
  { id: 2, type: "contest", when: "in 7 days", title: "Weekly Contest 471", linkText: "Weekly Contest 471", desc: "", category: "Contest", authorName: "LeetCode", authorIcon: null, views: 220 },
  { id: 3, type: "announcement", when: "12 days ago", authorIcon: null, authorName: "LeetCode", title: "What to ✨ Ask Leet. Share Story and Win Prizes 🎁", desc: "👋 Hello LeetCoders! We're excited to introduce a new feature to your coding experience...", category: "Platform", views: 540 },
  { id: 4, type: "post", when: "36 minutes ago", authorIcon: null, authorName: "An anonymous user", title: "Microsoft L61 offer", desc: "YOE: 3+ (NON MAANG but top) Role: SDE2 CTC: 30lpa + ~9lakhs esops yearly Offer Location: Hyderabad Level: L61 Base: 32lpa...", category: "Jobs", views: 340 },
  { id: 5, type: "post", when: "15 minutes ago", authorIcon: null, authorName: "fipao", title: "Is there a list of keyboard shortcut for Linux?", desc: "I recently moved to Linux, and while using leetcode I noticed that keyboard shortcuts are different depending on the OS...", category: "Platform", views: 85 },
  { id: 6, type: "post", when: "an hour ago", authorIcon: null, authorName: "An anonymous user", title: "Google Interviews Freeze !!!", desc: "Are google interviews for L3 positions freezed? Is it for New Grad 2026 role as well? Someone please confirm.", category: "Jobs", views: 120 },
];

export default function Blog() {
  const [feed, setFeed] = useState(initialFeed);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [detailPost, setDetailPost] = useState(null);
  const [form, setForm] = useState({
    type: "post",
    title: "",
    desc: "",
    authorName: "",
    category: "General",
    thumbnail: "",
  });

  const categories = useMemo(() => {
    const seen = new Map();
    feed.forEach(f => {
      const cat = (f.category || "General").trim();
      const key = cat.toLowerCase();
      if (!seen.has(key)) seen.set(key, cat);
    });
    return ["All", ...Array.from(seen.values())];
  }, [feed]);

  const filtered = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    const selCat = selectedCategory;

    return feed.filter(item => {
      const title = (item.title || "").toLowerCase();
      const desc = (item.desc || "").toLowerCase();
      const category = (item.category || "general").toLowerCase().trim();

      const matchesSearch = !term || title.includes(term) || desc.includes(term);
      const matchesCategory = selCat === "All" || category === selCat.toLowerCase().trim();

      return matchesSearch && matchesCategory;
    });
  }, [feed, searchTerm, selectedCategory]);

  const topBlogs = useMemo(() => {
    return [...feed].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
  }, [feed]);

  const openDetail = (item) => {
    setFeed(prev => prev.map(p => (p.id === item.id ? { ...p, views: (p.views || 0) + 1 } : p)));
    setDetailPost({ ...item, views: (item.views || 0) + 1 });
  };

  const handleCreateOpen = () => {
    setForm({ type: "post", title: "", desc: "", authorName: "", category: "General", thumbnail: "" });
    setShowCreate(true);
  };
  const handleCreateClose = () => setShowCreate(false);
  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  const handleCreateSubmit = e => {
    e.preventDefault();
    if (!form.title.trim() || !form.authorName.trim()) {
      alert("Please fill title and author name.");
      return;
    }
    const newItem = {
      id: Date.now(),
      type: form.type,
      when: "just now",
      title: form.title,
      desc: form.desc,
      category: form.category || "General",
      authorName: form.authorName,
      authorIcon: null,
      thumbnail: form.thumbnail || "",
      views: 0,
    };
    setFeed(prev => [newItem, ...prev]);
    setShowCreate(false);
  };

  return (
    <div className="feed-container">
      <div className="feed-inner left-sidebar-layout">
        <div className="top-row">
          <h1 className="blog-page-title">Blogs</h1>
          <div className="controls-right">
            <input
              className="blog-search"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button className="create-button" onClick={handleCreateOpen}>+ Create</button>
          </div>
        </div>

        <div className="main-layout left-first">
          <aside className="left-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-title">Top Rated</div>
              <ol className="top-list">
                {topBlogs.map(t => (
                  <li key={t.id} className="top-item">
                    <a
                      href="#"
                      className="top-link"
                      onClick={(e) => { e.preventDefault(); openDetail(t); }}
                    >
                      <div className="top-left"><Avatar src={t.authorIcon} name={t.authorName} /></div>
                      <div className="top-right">
                        <div className="top-title">{t.title}</div>
                        <div className="top-meta">{t.authorName} • {t.views || 0} views</div>
                      </div>
                    </a>
                  </li>
                ))}
              </ol>
            </div>

            <div className="sidebar-card">
              <div className="sidebar-title">Categories</div>
              <div className="cat-list">
                {categories.slice(1).map(c => (
                  <button key={c} className="cat-btn" onClick={() => setSelectedCategory(c)}>{c}</button>
                ))}
              </div>
            </div>
          </aside>

          <div className="feed-column">
            <div className="feed-list">
              {filtered.length === 0 && <div className="no-results">No posts match your filters.</div>}

              {filtered.map(item => (
                <div className="feed-item" key={item.id}>
                  <div className="feed-left">
                    <div className="when">{item.when}</div>
                    <div className="left-icon">
                      {item.type === "contest" ? <TrophyIcon /> : <Avatar src={item.authorIcon} name={item.authorName} />}
                    </div>
                  </div>

                  <div className="feed-right">
                    <div className="feed-header" onClick={() => openDetail(item)} style={{ cursor: "pointer" }}>
                      {item.type === "contest" ? (
                        <div className="contest-line">
                          <span className="contest-text">Join our next Contest </span>
                          <a href="#" className="feed-link" onClick={(e)=>e.preventDefault()}>{item.linkText || item.title}</a>
                        </div>
                      ) : (
                        <div className="title-line">
                          <span className="author"><strong className="author-name">{item.authorName}</strong> posted</span>
                          <span className="title-link"> <a href="#" className="feed-link" onClick={(e)=>e.preventDefault()}>{item.title}</a></span>
                          <span className="meta-right"> • {item.category}</span>
                        </div>
                      )}
                    </div>

                    {item.desc && <div className="feed-snippet" onClick={() => openDetail(item)}>{item.desc}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="modal-overlay" onMouseDown={handleCreateClose}>
          <div className="modal" onMouseDown={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Post</h3>
              <button className="modal-close" onClick={handleCreateClose}>✕</button>
            </div>

            <form className="create-form" onSubmit={handleCreateSubmit}>
              <label className="form-row">
                <span className="form-label">Type</span>
                <select name="type" value={form.type} onChange={handleFormChange}>
                  <option value="post">Post</option>
                  <option value="announcement">Announcement</option>
                  <option value="contest">Contest</option>
                </select>
              </label>

              <label className="form-row">
                <span className="form-label">Title *</span>
                <input name="title" value={form.title} onChange={handleFormChange} />
              </label>

              <label className="form-row">
                <span className="form-label">Short description</span>
                <input name="desc" value={form.desc} onChange={handleFormChange} />
              </label>

              <label className="form-row">
                <span className="form-label">Author *</span>
                <input name="authorName" value={form.authorName} onChange={handleFormChange} />
              </label>

              <label className="form-row">
                <span className="form-label">Category</span>
                <input name="category" value={form.category} onChange={handleFormChange} />
              </label>

              <label className="form-row">
                <span className="form-label">Thumbnail URL</span>
                <input name="thumbnail" value={form.thumbnail} onChange={handleFormChange} />
              </label>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCreateClose}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailPost && (
        <div className="modal-overlay" onMouseDown={() => setDetailPost(null)}>
          <div className="modal detail-modal" onMouseDown={(e)=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>{detailPost.title}</h3>
              <button className="modal-close" onClick={() => setDetailPost(null)}>✕</button>
            </div>

            <div className="detail-body">
              <div className="detail-meta">{detailPost.authorName} • {detailPost.when} • {detailPost.category} • {detailPost.views || 0} views</div>
              <div className="detail-content">{detailPost.desc || "No additional content."}</div>
            </div>

            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button className="btn-secondary" onClick={() => setDetailPost(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
