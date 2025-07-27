const express = require("express");
const router = express.Router();

// Clean login route - no layout, no header, no footer
router.get("/login", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Yadav Collection</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 0;
        }
        .login-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 25px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
            padding: 3rem;
            width: 100%;
            max-width: 450px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .login-header {
            text-align: center;
            margin-bottom: 2.5rem;
        }
        .login-header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #333;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .login-header p {
            color: #666;
            font-size: 1.1rem;
        }
        .form-control {
            border: 2px solid #e9ecef;
            border-radius: 15px;
            padding: 1rem 1.5rem;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.9);
        }
        .form-control:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
            background: white;
        }
        .btn-primary {
            background: linear-gradient(45deg, #667eea, #764ba2);
            border: none;
            border-radius: 15px;
            padding: 1rem 2rem;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        .forgot-password {
            text-align: right;
            margin-bottom: 1.5rem;
        }
        .forgot-password a {
            color: #667eea;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
        }
        .divider {
            text-align: center;
            margin: 2rem 0;
            position: relative;
        }
        .divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: rgba(0,0,0,0.1);
        }
        .divider span {
            background: white;
            padding: 0 1rem;
            color: #666;
            font-size: 0.9rem;
        }
        .btn-social {
            border-radius: 15px;
            padding: 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-social:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your account to continue shopping</p>
        </div>

        <div class="login-form">
            <form id="loginForm" action="/api/auth/web/login" method="POST">
                <div class="mb-3">
                    <input type="email" id="email" class="form-control" name="email" placeholder="name@example.com" required>
                </div>

                <div class="mb-3 position-relative">
                    <input type="password" id="password" class="form-control" name="password" placeholder="Password" required>
                    <button type="button" class="btn btn-link position-absolute end-0 top-50 translate-middle-y" onclick="togglePassword()">
                        <i id="passwordIcon" class="fas fa-eye"></i>
                    </button>
                </div>

                <div class="forgot-password">
                    <a href="/users/forgot-password">Forgot your password?</a>
                </div>

                <button type="submit" class="btn btn-primary w-100 mb-3" id="loginBtn">
                    <span><i class="fas fa-sign-in-alt me-2"></i>Sign In</span>
                </button>
            </form>

            <div class="divider">
                <span>or continue with</span>
            </div>

            <div class="d-grid gap-2">
                <button class="btn btn-outline-secondary btn-social btn-google" onclick="loginWithGoogle()">
                    <span><i class="fab fa-google me-2"></i>Continue with Google</span>
                </button>
                <button class="btn btn-outline-secondary btn-social btn-facebook" onclick="loginWithFacebook()">
                    <span><i class="fab fa-facebook-f me-2"></i>Continue with Facebook</span>
                </button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function togglePassword() {
            const passwordInput = document.getElementById('password');
            const passwordIcon = document.getElementById('passwordIcon');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordIcon.classList.remove('fa-eye');
                passwordIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                passwordIcon.classList.remove('fa-eye-slash');
                passwordIcon.classList.add('fa-eye');
            }
        }

        document.getElementById('loginForm').addEventListener('submit', function(e) {
            const loginBtn = document.getElementById('loginBtn');
            const btnText = loginBtn.querySelector('span');
            
            loginBtn.classList.add('btn-loading');
            btnText.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing In...';
            loginBtn.disabled = true;
        });

        function loginWithGoogle() {
            alert('Google login not implemented yet');
        }

        function loginWithFacebook() {
            alert('Facebook login not implemented yet');
        }

        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('email').focus();
        });
    </script>
</body>
</html>`);
});

// Clean register route - no layout, no header, no footer
router.get("/register", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - Yadav Collection</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 0;
        }
        .register-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 25px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
            padding: 3rem;
            width: 100%;
            max-width: 500px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .register-header {
            text-align: center;
            margin-bottom: 2.5rem;
        }
        .register-header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #333;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .register-header p {
            color: #666;
            font-size: 1.1rem;
        }
        .form-control {
            border: 2px solid #e9ecef;
            border-radius: 15px;
            padding: 1rem 1.5rem;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.9);
        }
        .form-control:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
            background: white;
        }
        .btn-primary {
            background: linear-gradient(45deg, #667eea, #764ba2);
            border: none;
            border-radius: 15px;
            padding: 1rem 2rem;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        .divider {
            text-align: center;
            margin: 2rem 0;
            position: relative;
        }
        .divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: rgba(0,0,0,0.1);
        }
        .divider span {
            background: white;
            padding: 0 1rem;
            color: #666;
            font-size: 0.9rem;
        }
        .btn-social {
            border-radius: 15px;
            padding: 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn-social:hover {
            transform: translateY(-2px);
        }
        .password-strength {
            margin-top: 0.5rem;
            padding: 0.5rem;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 500;
        }
        .strength-weak {
            background: rgba(255, 107, 107, 0.1);
            color: #ff6b6b;
            border: 1px solid rgba(255, 107, 107, 0.3);
        }
        .strength-medium {
            background: rgba(255, 193, 7, 0.1);
            color: #ffc107;
            border: 1px solid rgba(255, 193, 7, 0.3);
        }
        .strength-strong {
            background: rgba(81, 207, 102, 0.1);
            color: #51cf66;
            border: 1px solid rgba(81, 207, 102, 0.3);
        }
    </style>
</head>
<body>
    <div class="register-container">
        <div class="register-header">
            <h1>Create Account</h1>
            <p>Join Yadav Collection for exclusive access</p>
        </div>

        <div class="register-form">
            <form id="registerForm" action="/api/auth/web/register" method="POST">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <input type="text" id="firstName" class="form-control" name="firstName" placeholder="First Name" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <input type="text" id="lastName" class="form-control" name="lastName" placeholder="Last Name" required>
                    </div>
                </div>

                <div class="mb-3">
                    <input type="text" id="username" class="form-control" name="username" placeholder="Username" required>
                </div>

                <div class="mb-3">
                    <input type="email" id="email" class="form-control" name="email" placeholder="Email Address" required>
                </div>

                <div class="mb-3 position-relative">
                    <input type="password" id="password" class="form-control" name="password" placeholder="Password" required>
                    <button type="button" class="btn btn-link position-absolute end-0 top-50 translate-middle-y" onclick="togglePassword('password')">
                        <i id="passwordIcon" class="fas fa-eye"></i>
                    </button>
                    <div id="passwordStrength" class="password-strength" style="display: none;">
                        <span id="strengthText"></span>
                    </div>
                </div>

                <div class="mb-3 position-relative">
                    <input type="password" id="confirmPassword" class="form-control" name="confirmPassword" placeholder="Confirm Password" required>
                    <button type="button" class="btn btn-link position-absolute end-0 top-50 translate-middle-y" onclick="togglePassword('confirmPassword')">
                        <i id="confirmPasswordIcon" class="fas fa-eye"></i>
                    </button>
                </div>

                <div class="form-check terms-checkbox">
                    <input class="form-check-input" type="checkbox" id="termsCheck" required>
                    <label class="form-check-label" for="termsCheck">
                        I agree to the <a href="/terms" target="_blank">Terms & Conditions</a> and <a href="/privacy" target="_blank">Privacy Policy</a>
                    </label>
                </div>

                <button type="submit" class="btn btn-primary w-100 mb-3" id="registerBtn">
                    <span><i class="fas fa-user-plus me-2"></i>Create Account</span>
                </button>
            </form>

            <div class="divider">
                <span>or continue with</span>
            </div>

            <div class="d-grid gap-2">
                <button class="btn btn-outline-secondary btn-social btn-google" onclick="registerWithGoogle()">
                    <span><i class="fab fa-google me-2"></i>Continue with Google</span>
                </button>
                <button class="btn btn-outline-secondary btn-social btn-facebook" onclick="registerWithFacebook()">
                    <span><i class="fab fa-facebook-f me-2"></i>Continue with Facebook</span>
                </button>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function togglePassword(fieldId) {
            const passwordInput = document.getElementById(fieldId);
            const passwordIcon = document.getElementById(fieldId === 'password' ? 'passwordIcon' : 'confirmPasswordIcon');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                passwordIcon.classList.remove('fa-eye');
                passwordIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                passwordIcon.classList.remove('fa-eye-slash');
                passwordIcon.classList.add('fa-eye');
            }
        }

        function checkPasswordStrength(password) {
            const strengthDiv = document.getElementById('passwordStrength');
            const strengthText = document.getElementById('strengthText');
            
            if (password.length === 0) {
                strengthDiv.style.display = 'none';
                return;
            }

            let strength = 0;
            let feedback = [];

            if (password.length >= 8) strength++;
            else feedback.push('at least 8 characters');

            if (/[a-z]/.test(password)) strength++;
            else feedback.push('lowercase letter');

            if (/[A-Z]/.test(password)) strength++;
            else feedback.push('uppercase letter');

            if (/[0-9]/.test(password)) strength++;
            else feedback.push('number');

            if (/[^A-Za-z0-9]/.test(password)) strength++;
            else feedback.push('special character');

            strengthDiv.style.display = 'block';
            strengthDiv.className = 'password-strength';

            if (strength <= 2) {
                strengthDiv.classList.add('strength-weak');
                strengthText.innerHTML = \`Weak password. Add: \${feedback.join(', ')}\`;
            } else if (strength <= 4) {
                strengthDiv.classList.add('strength-medium');
                strengthText.innerHTML = \`Medium strength. Add: \${feedback.join(', ')}\`;
            } else {
                strengthDiv.classList.add('strength-strong');
                strengthText.innerHTML = 'Strong password!';
            }
        }

        function checkPasswordMatch() {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const confirmInput = document.getElementById('confirmPassword');

            if (confirmPassword.length > 0) {
                if (password === confirmPassword) {
                    confirmInput.style.borderColor = '#51cf66';
                    confirmInput.style.boxShadow = '0 0 0 0.2rem rgba(81, 207, 102, 0.25)';
                } else {
                    confirmInput.style.borderColor = '#ff6b6b';
                    confirmInput.style.boxShadow = '0 0 0 0.2rem rgba(255, 107, 107, 0.25)';
                }
            } else {
                confirmInput.style.borderColor = '#e9ecef';
                confirmInput.style.boxShadow = 'none';
            }
        }

        document.getElementById('registerForm').addEventListener('submit', function(e) {
            const registerBtn = document.getElementById('registerBtn');
            const btnText = registerBtn.querySelector('span');
            
            registerBtn.classList.add('btn-loading');
            btnText.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';
            registerBtn.disabled = true;
        });

        document.getElementById('password').addEventListener('input', function() {
            checkPasswordStrength(this.value);
            checkPasswordMatch();
        });

        document.getElementById('confirmPassword').addEventListener('input', checkPasswordMatch);

        function registerWithGoogle() {
            alert('Google registration not implemented yet');
        }

        function registerWithFacebook() {
            alert('Facebook registration not implemented yet');
        }

        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('firstName').focus();
        });
    </script>
</body>
</html>`);
});

module.exports = router; 