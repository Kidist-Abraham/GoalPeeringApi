const jwt = require("jsonwebtoken");


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    console.log("access denied!", token)
    return res.status(401).json({ message: "Access denied" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

// A socket middleware function
function authenticateSocket(socket, next) {
  try {
    const authHeader = socket.handshake.headers["authorization"];

    let token;
    if (authHeader) {
      token = authHeader.split(" ")[1];
    } else {
      token = socket.handshake.query.token;
    }

    if (!token) {
      return next(new Error("No token provided"));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return next(new Error("Invalid token"));
      }
      socket.user = user;
      return next();
    });
  } catch (error) {
    return next(new Error("Authentication error"));
  }
}


module.exports = { authenticateToken, authenticateSocket };
