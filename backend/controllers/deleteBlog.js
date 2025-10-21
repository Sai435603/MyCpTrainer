import Blog from "../models/Blog.js";
export default async function deleteBlog(req, res) {
  try {
    const id = req.params.id;

    const deleted = await Blog.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Blog not found" });

    return res.status(200).json({ message: "Blog deleted", id: deleted._id });
  } catch (error) {
    console.error("deleteBlog error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
}