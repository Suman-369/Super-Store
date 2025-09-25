const jwt = require("jsonwebtoken");


function createAuthMiddleware(roles =["user"]){
    return function authMiddleware(req, res, next) {
        const token = req.cookies.token || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ message: "Access denied. No token provided." });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (!roles.includes(decoded.role)) {
                return res.status(403).json({ message: "Access denied. Insufficient permissions." });
            }
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(400).json({ message: "Invalid token." });
        }
    }
}

module.exports = {
    createAuthMiddleware
}