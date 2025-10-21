import Blog from "../models/Blog.js";
export default async function updateBlog(req, res) {
  try {
    const id = req.params.id;
    const { type, title, desc, category, authorName, thumbnail } = req.body;

    if (!title || !authorName) {
      return res.status(400).json({ message: "Title and Author Name are required." });
    }

    const updated = await Blog.findByIdAndUpdate(
      id,
      { type, title, desc, category, authorName, thumbnail, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Blog not found" });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("updateBlog error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}