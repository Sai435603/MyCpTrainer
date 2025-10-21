import React, { useState, useMemo, useEffect } from "react";
import "../styles/Blogs.css";
import {BASE_URL} from "../constants.js";
const formatRelativeTime = (dateString) => {
  if (!dateString) return "unknown";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "unknown";
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  return `${days} days ago`;
};

// --- FIXED: New and improved Trophy Icon SVG ---
const TrophyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M17.5 5C17.5 3.34315 16.1569 2 14.5 2H9.5C7.84315 2 6.5 3.34315 6.5 5V7H17.5V5Z"
      fill="#FFD700"
    />
    <path d="M18 7H6V14C6 15.1046 6.89543 16 8 16H16C17.1046 16 18 15.1046 18 14V7Z" fill="#FFC107"/>
    <path d="M20 9C21.1046 9 22 9.89543 22 11V12C22 13.1046 21.1046 14 20 14H18V9H20Z" fill="#FFC107"/>
    <path d="M4 9C2.89543 9 2 9.89543 2 11V12C2 13.1046 2.89543 14 4 14H6V9H4Z" fill="#FFC107"/>
    <path d="M14 16V19H10V16H14Z" fill="#B8860B"/>
    <path d="M16 19H8V21C8 21.5523 8.44772 22 9 22H15C15.5523 22 16 21.5523 16 21V19Z" fill="#DAA520"/>
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

export default function Blog() {
  const [feed, setFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const [editPost, setEditPost] = useState(null);
  const [editForm, setEditForm] = useState({
    type: "post",
    title: "",
    desc: "",
    authorName: "",
    category: "General",
    thumbnail: "",
  });

  const getLocalAuthor = () => {
    try {
      return localStorage.getItem("blogAuthor") || "";
    } catch {
      return "";
    }
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${BASE_URL}/api/blogs`);
        if (!response.ok) {
          const text = await response.text();
          console.error("Non-OK response fetching blogs:", response.status, text.slice(0, 300));
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          setFeed([]);
          return;
        }
        const storedAuthor = getLocalAuthor();
        const formatted = data.map((post) => ({
          ...post,
          id: post._id || post.id,
          when: formatRelativeTime(post.createdAt || post.created_at || post.updatedAt),
          isOwner: !!storedAuthor && post.authorName === storedAuthor,
        }));
        setFeed(formatted);
      } catch (error) {
        console.error("Failed to fetch blogs:", error);
        setFeed([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const categories = useMemo(() => {
    const seen = new Set();
    feed.forEach((f) => {
      const cat = (f.category || "General").trim();
      if (cat) seen.add(cat);
    });
    return ["All", ...Array.from(seen).sort()];
  }, [feed]);

  const filtered = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    return feed.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const desc = (item.desc || "").toLowerCase();
      const category = (item.category || "general").toLowerCase().trim();
      const matchesSearch = !term || title.includes(term) || desc.includes(term);
      const matchesCategory = selectedCategory === "All" || category === selectedCategory.toLowerCase().trim();
      return matchesSearch && matchesCategory;
    });
  }, [feed, searchTerm, selectedCategory]);

  const topBlogs = useMemo(() => {
    return [...feed].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
  }, [feed]);

  const openDetail = async (item) => {
    try {
      const response = await fetch(`${BASE_URL}/api/blogs/${item.id}`);
      if (!response.ok) throw new Error("Failed to fetch post details");
      const updatedPost = await response.json();
      const storedAuthor = getLocalAuthor();
      const formattedPost = {
        ...updatedPost,
        id: updatedPost._id || updatedPost.id,
        when: formatRelativeTime(updatedPost.createdAt || updatedPost.created_at),
        isOwner: !!storedAuthor && updatedPost.authorName === storedAuthor,
      };
      setFeed((prev) => prev.map((p) => (p.id === formattedPost.id ? formattedPost : p)));
      setDetailPost(formattedPost);
    } catch (error) {
      console.error("Failed to fetch post details:", error);
      setFeed((prev) => prev.map((p) => (p.id === item.id ? { ...p, views: (p.views || 0) + 1 } : p)));
      setDetailPost({ ...item, views: (item.views || 0) + 1 });
    }
  };

  const handleCreateOpen = () => {
    setForm({ type: "post", title: "", desc: "", authorName: "", category: "General", thumbnail: "" });
    setShowCreate(true);
  };
  const handleCreateClose = () => setShowCreate(false);
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.authorName.trim()) {
      alert("Please fill title and author name.");
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/blogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          desc: form.desc,
          category: form.category,
          authorName: form.authorName,
          thumbnail: form.thumbnail,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("Create failed, server returned:", response.status, text.slice(0, 500));
        throw new Error("Failed to create post");
      }
      const newPost = await response.json();
      const storedAuthor = form.authorName;
      try { localStorage.setItem("blogAuthor", storedAuthor); } catch {}
      const formattedPost = {
        ...newPost,
        id: newPost._id || newPost.id,
        when: formatRelativeTime(newPost.createdAt || newPost.created_at),
        isOwner: true,
      };
      setFeed((prev) => [formattedPost, ...prev]);
      setShowCreate(false);
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Error creating post. See console for details.");
    }
  };

  const handleEditOpen = (post) => {
    setEditPost(post);
    setEditForm({
      type: post.type || "post",
      title: post.title || "",
      desc: post.desc || "",
      authorName: post.authorName || "",
      category: post.category || "General",
      thumbnail: post.thumbnail || "",
    });
  };
  const handleEditClose = () => setEditPost(null);
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editPost) return;
    if (!editForm.title.trim() || !editForm.authorName.trim()) {
      alert("Please fill title and author name.");
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/blogs/${editPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editForm.type,
          title: editForm.title,
          desc: editForm.desc,
          category: editForm.category,
          authorName: editForm.authorName,
          thumbnail: editForm.thumbnail,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("Update failed, server returned:", response.status, text.slice(0, 500));
        throw new Error("Failed to update post");
      }
      const updated = await response.json();
      const storedAuthor = editForm.authorName;
      try { localStorage.setItem("blogAuthor", storedAuthor); } catch {}
      const formatted = {
        ...updated,
        id: updated._id || updated.id,
        when: formatRelativeTime(updated.createdAt || updated.created_at),
        isOwner: !!storedAuthor && updated.authorName === storedAuthor,
      };
      setFeed((prev) => prev.map((p) => (p.id === formatted.id ? formatted : p)));
      setDetailPost((d) => (d && d.id === formatted.id ? formatted : d));
      setEditPost(null);
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Error updating post. See console for details.");
    }
  };

  // --- FIXED: Added full URL to the delete fetch call ---
  const handleDelete = async (post) => {
    if (!post || !post.id) return;
    const confirmMsg = `Delete "${post.title}" by ${post.authorName}? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // Optimistic update: remove from UI immediately
      setFeed((prev) => prev.filter((p) => p.id !== post.id));
      if (detailPost && detailPost.id === post.id) setDetailPost(null);
      if (editPost && editPost.id === post.id) setEditPost(null);

      // Make the API call to the correct endpoint
      const response = await fetch(`${BASE_URL}/api/blogs/${post.id}`, { method: "DELETE" });
      
      if (!response.ok) {
        // If the delete fails, alert the user and refetch the data to revert the UI
        alert("Failed to delete the post. Restoring feed.");
        console.error("Delete failed, status:", response.status);
        const reResp = await fetch("${BASE_URL}/api/blogs");
        if (reResp.ok) {
          const data = await reResp.json();
          const storedAuthor = getLocalAuthor();
          const formatted = data.map((p) => ({
            ...p,
            id: p._id || p.id,
            when: formatRelativeTime(p.createdAt || p.created_at),
            isOwner: !!storedAuthor && p.authorName === storedAuthor,
          }));
          setFeed(formatted);
        }
      } else {
        console.log("Deleted post", post.id);
      }
    } catch (err) {
      alert("An error occurred while deleting the post. Restoring feed.");
      console.error("Error deleting post:", err);
      // Also refetch on any other error
      const reResp = await fetch("${BASE_URL}/api/blogs");
      if (reResp.ok) {
        const data = await reResp.json();
        const storedAuthor = getLocalAuthor();
        const formatted = data.map((p) => ({ ...p, id: p._id || p.id, when: formatRelativeTime(p.createdAt || p.created_at), isOwner: !!storedAuthor && p.authorName === storedAuthor }));
        setFeed(formatted);
      }
    }
  };

  const renderOwnerControls = (post) => {
    if (!post || !post.isOwner) return null;
    return (
      <div style={{ marginLeft: 8, display: "flex", gap: 8 }}>
        <button className="btn-secondary" onClick={() => handleEditOpen(post)}>Edit</button>
        <button className="btn-danger" onClick={() => handleDelete(post)}>Delete</button>
      </div>
    );
  };

  if (isLoading) {
    return <div className="feed-container">Loading posts...</div>;
  }

  // The rest of your JSX remains the same
  return (
    <div className="feed-container">
      <div className="feed-inner left-sidebar-layout">
        <div className="top-row">
          <h1 className="blog-page-title">Blogs</h1>
          <div className="controls-right">
            <input className="blog-search" placeholder="Search posts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <select className="filter-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <button className="create-button" onClick={handleCreateOpen}>+ Create</button>
          </div>
        </div>

        <div className="main-layout left-first">
          <aside className="left-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-title">Top Rated</div>
              <ol className="top-list">
                {topBlogs.map((t) => (
                  <li key={t.id} className="top-item">
                    <div role="button" tabIndex={0} className="top-link" onClick={() => openDetail(t)} onKeyDown={(e) => e.key === "Enter" && openDetail(t)}>
                      <div className="top-left"><Avatar src={t.authorIcon} name={t.authorName} /></div>
                      <div className="top-right">
                        <div className="top-title">{t.title}</div>
                        <div className="top-meta">{t.authorName} • {t.views || 0} views</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="feed-column">
            <div className="feed-list">
              {filtered.length === 0 && <div className="no-results">No posts match your filters.</div>}
              {filtered.map((item) => (
                <div className="feed-item" key={item.id}>
                  <div className="feed-left">
                    <div className="when">{item.when}</div>
                    <div className="left-icon">{item.type === "contest" ? <TrophyIcon /> : <Avatar src={item.authorIcon} name={item.authorName} />}</div>
                  </div>

                  <div className="feed-right">
                    <div className="feed-header" style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div onClick={() => openDetail(item)} style={{ flex: 1 }}>
                        {item.type === "contest" ? (
                          <div className="contest-line">
                            <span className="contest-text">Join our next Contest </span>
                            <a href={`/contests/${item.id}`} className="feed-link" onClick={(e) => e.stopPropagation()}>{item.linkText || item.title}</a>
                          </div>
                        ) : (
                          <div className="title-line">
                            <span className="author"><strong className="author-name">{item.authorName}</strong> posted</span>
                            <span className="title-link"> <span className="feed-link">{item.title}</span></span>
                            <span className="meta-right"> • {item.category}</span>
                          </div>
                        )}
                      </div>
                      {renderOwnerControls(item)}
                    </div>
                    {item.desc && <div className="feed-snippet" onClick={() => openDetail(item)} style={{ cursor: "pointer" }}>{item.desc}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

        {showCreate && (
          <div className="modal-overlay" onMouseDown={handleCreateClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Create Post</h3><button className="modal-close" onClick={handleCreateClose}>✕</button></div>
              <form className="create-form" onSubmit={handleCreateSubmit}>
                <label className="form-row"><span className="form-label">Type</span>
                  <select name="type" value={form.type} onChange={handleFormChange}><option value="post">Post</option><option value="announcement">Announcement</option><option value="contest">Contest</option></select>
                </label>
                <label className="form-row"><span className="form-label">Title *</span><input name="title" value={form.title} onChange={handleFormChange} /></label>
                <label className="form-row"><span className="form-label">Short description</span><input name="desc" value={form.desc} onChange={handleFormChange} /></label>
                <label className="form-row"><span className="form-label">Author *</span><input name="authorName" value={form.authorName} onChange={handleFormChange} /></label>
                <label className="form-row"><span className="form-label">Category</span><input name="category" value={form.category} onChange={handleFormChange} /></label>
                <label className="form-row"><span className="form-label">Thumbnail URL</span><input name="thumbnail" value={form.thumbnail} onChange={handleFormChange} /></label>
                <div className="modal-actions"><button type="button" className="btn-secondary" onClick={handleCreateClose}>Cancel</button><button type="submit" className="btn-primary">Create</button></div>
              </form>
            </div>
          </div>
        )}

        {editPost && (
          <div className="modal-overlay" onMouseDown={handleEditClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Edit Post</h3><button className="modal-close" onClick={handleEditClose}>✕</button></div>
              <form className="create-form" onSubmit={handleEditSubmit}>
                <label className="form-row"><span className="form-label">Type</span>
                  <select name="type" value={editForm.type} onChange={handleEditFormChange}><option value="post">Post</option><option value="announcement">Announcement</option><option value="contest">Contest</option></select>
                </label>
                <label className="form-row"><span className="form-label">Title *</span><input name="title" value={editForm.title} onChange={handleEditFormChange} /></label>
                <label className="form-row"><span className="form-label">Short description</span><input name="desc" value={editForm.desc} onChange={handleEditFormChange} /></label>
                <label className="form-row"><span className="form-label">Author *</span><input name="authorName" value={editForm.authorName} onChange={handleEditFormChange} /></label>
                <label className="form-row"><span className="form-label">Category</span><input name="category" value={editForm.category} onChange={handleEditFormChange} /></label>
                <label className="form-row"><span className="form-label">Thumbnail URL</span><input name="thumbnail" value={editForm.thumbnail} onChange={handleEditFormChange} /></label>
                <div className="modal-actions"><button type="button" className="btn-secondary" onClick={handleEditClose}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
              </form>
            </div>
          </div>
        )}

        {detailPost && (
          <div className="modal-overlay" onMouseDown={() => setDetailPost(null)}>
            <div className="modal detail-modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3>{detailPost.title}</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {detailPost.isOwner && <button className="btn-secondary" onClick={() => handleEditOpen(detailPost)}>Edit</button>}
                  {detailPost.isOwner && <button className="btn-danger" onClick={() => handleDelete(detailPost)}>Delete</button>}
                  <button className="modal-close" onClick={() => setDetailPost(null)}>✕</button>
                </div>
              </div>
              <div className="detail-body">
                <div className="detail-meta">{detailPost.authorName} • {detailPost.when} • {detailPost.category} • {detailPost.views || 0} views</div>
                <div className="detail-content">{detailPost.desc || "No additional content."}</div>
              </div>
              <div className="modal-actions" style={{ marginTop: 12 }}><button className="btn-secondary" onClick={() => setDetailPost(null)}>Close</button></div>
            </div>
          </div>
        )}
    </div>
  );
}