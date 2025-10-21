import Blog from "../models/Blog.js";
export default async function getBlogById(req, res){
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true } 
    );

    if (!blog) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};