import  Mongoose  from "mongoose";

// —————— Mongoose Connection ——————
async function setUpDatabase() {
  await Mongoose.connect("mongodb://localhost:27017/mycptrainer")
    .then(async () => {
      console.log("Database Connected");
    })
    .catch((e) => {
      throw new Error("Database connection failed: " + e.message);
    });
}

export default setUpDatabase;
