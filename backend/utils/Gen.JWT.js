const jwt = require("jsonwebtoken");
const fs = require('fs');


const GenerateToken = (payload) => {
    try {
        const private_key = fs.readFileSync(process.env.PATH_PRIVATE_KEY, "utf-8"); 
        const fastapi_jwt_token = jwt.sign(
            {
                ...payload,
                // iat:Date.now()
            },
            private_key,
            {
                algorithm: 'RS256',
                expiresIn: process.env.FASTAPI_JWT_EXPIRY
            }
        )

        return { success: true, token: fastapi_jwt_token }
    }
    catch (err) {
        return { success: false, message: err.message }
    }
}







module.exports = { GenerateToken }