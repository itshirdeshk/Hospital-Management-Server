const {Router} = require('express');
const { registerUser, loginUser, requestPasswordReset, resetPassword } = require('../controllers/userController');


const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/reset-password' , requestPasswordReset);
router.post('/reset-password/:token' , resetPassword);

module.exports = router;