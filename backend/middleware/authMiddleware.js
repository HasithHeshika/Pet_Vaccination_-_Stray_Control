const jwt = require('jsonwebtoken');

const verifyRole = (roles) => {
    return (req, res, next) => {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (!roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Access denied' });
            }

            req.user = decoded;
            next();
        } catch {
            res.status(401).json({ message: 'Unauthorized' });
        }
    };
};

module.exports = { verifyRole };
