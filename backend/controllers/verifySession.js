export default function verifySession(req, res){
 return  res.status(200).json({
    message: "User is authenticated.",
    user: req.user, 
  });
}