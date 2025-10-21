import  Mongoose  from "mongoose";
async function setUpDatabase() {
  const DB_URL = process.env.MONGODB_URI || "mongodb://localhost:27017/mycptrainer";
  await Mongoose.connect(DB_URL)
    .then(async () => {
      console.log("Database Connected");
    })
    .catch((e) => {
      throw new Error("Database connection failed: " + e.message);
    });
}

export default setUpDatabase;
