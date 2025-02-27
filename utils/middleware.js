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
    // 1) Get the token from the handshake query
    //    e.g. socket.handshake.query.token
    // OR from headers: socket.handshake.headers['authorization']
    const authHeader = socket.handshake.headers["authorization"];

    let token;
    if (authHeader) {
      // Bearer <token>
      token = authHeader.split(" ")[1];
    } else {
      // If you're passing the token as a query param
      // e.g., io("...:3000", { query: { token } })
      token = socket.handshake.query.token;
    }

    if (!token) {
      return next(new Error("No token provided"));
    }

    // 2) Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return next(new Error("Invalid token"));
      }
      // Attach the decoded payload (e.g. user id, email) to socket
      socket.user = user;
      return next(); // proceed
    });
  } catch (error) {
    return next(new Error("Authentication error"));
  }
}


module.exports = { authenticateToken, authenticateSocket };
