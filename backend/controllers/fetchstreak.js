import User from '../models/User.js';

export default async function fetchStreak(req, res) {
    try {
       
        const { user: handle } = req.params;

       
        const userData = await User.findOne({ handle: handle }).lean();

        if (!userData) {
            return res.status(404).json({ message: "User not found." });
        }

      
        res.status(200).json({ streak: userData.streak || 0 });

    } catch (error) {
        // 5. Handle any unexpected server errors.
        console.error("Error fetching streak:", error);
        res.status(500).json({ message: "Server error while fetching streak." });
    }
}