const logOutHandler = async (req, res) => {
  try {
    
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/", 
    };

    
    res
      .status(200)
      .clearCookie("token", cookieOptions)
      .json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Server error during logout." });
  }
};

export default logOutHandler;