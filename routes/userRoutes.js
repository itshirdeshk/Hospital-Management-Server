const {Router} = require('express');
const { registerUser, loginUser, requestPasswordReset, resetPassword , UserMedicalInfo ,getUserMedicalInfo } = require('../controllers/userController');
const { verifyToken } = require('../middlewares/verifyToken');


const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/reset-password' , requestPasswordReset);
router.post('/reset-password/:token' , resetPassword);
router.post('/medical-info' , verifyToken , UserMedicalInfo);
router.get('/get-medical-info' , verifyToken , getUserMedicalInfo);

module.exports = router;