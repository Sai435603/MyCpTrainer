import Blog from "../models/Blog.js";
export default async function createBlog(req, res){
  try {
    const { type, title, desc, category, authorName, thumbnail } = req.body;

    if (!title || !authorName) {
      return res.status(400).json({ message: "Title and Author Name are required." });
    }

    const newBlog = new Blog({
      type,
      title,
      desc,
      category,
      authorName,
      thumbnail,
    });

    const savedBlog = await newBlog.save();
    res.status(201).json(savedBlog);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};