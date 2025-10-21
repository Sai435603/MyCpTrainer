import Blog from "../models/Blog.js";

export default async function getAllBlogs(req, res) {
  try {
    const blogs = await Blog.find({}).sort({ createdAt: -1 });
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};