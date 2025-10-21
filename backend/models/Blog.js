import mongoose from "mongoose";
const { Schema, model } = mongoose;

const BlogSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["post", "announcement", "contest"],
      default: "post",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    desc: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      default: "General",
      trim: true,
    },
    authorName: {
      type: String,
      required: [true, "Author name is required"],
    },
    authorIcon: {
      type: String, 
    },
    thumbnail: {
      type: String, 
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true } 
);

const Blog = model("Blog", BlogSchema);
export default Blog;