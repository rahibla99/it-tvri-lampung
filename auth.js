document.addEventListener('DOMContentLoaded', () => {
    // Fungsi untuk inisialisasi default admin user (hanya jika belum ada user lain)
    const initializeAdminUser = () => {
        let users = JSON.parse(localStorage.getItem('users')) || [];
        if (users.length === 0) { // Hanya tambahkan admin jika tidak ada user sama sekali
            users.push({
                username: "admin",
                password: "admin123", // Password plain-text (untuk demo)
                role: "admin"
            });
            localStorage.setItem('users', JSON.stringify(users));
            console.log("Admin default user created: admin/admin123");
        }
    };

    initializeAdminUser(); // Panggil saat DOMContentLoaded

    // Fungsi untuk toggle password visibility
    const setupPasswordToggles = () => {
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const targetId = toggle.dataset.target;
                const passwordInput = document.getElementById(targetId);
                const icon = toggle.querySelector('i');

                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    };

    setupPasswordToggles(); // Setup toggles saat DOMContentLoaded

    // --- Logika untuk Halaman Login ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            let users = JSON.parse(localStorage.getItem('users')) || [];
            const user = users.find(u => u.username === username && u.password === password);

            if (user) {
                // Simpan sesi user yang login
                localStorage.setItem('loggedInUser', JSON.stringify(user));
                window.location.href = 'dashboard.html'; // Redirect ke halaman utama
            } else {
                alert('Username atau password salah!');
            }
        });
    }

    // --- Logika untuk Halaman Register ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const regUsernameInput = document.getElementById('regUsername');
            const regPasswordInput = document.getElementById('regPassword');
            const confirmPasswordInput = document.getElementById('confirmPassword');

            const username = regUsernameInput.value.trim();
            const password = regPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (password !== confirmPassword) {
                alert('Konfirmasi password tidak cocok!');
                return;
            }

            let users = JSON.parse(localStorage.getItem('users')) || [];

            // Cek apakah username sudah ada
            const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            if (existingUser) {
                alert('Username sudah digunakan! Pilih username lain.');
                return;
            }

            // Tambahkan user baru dengan role 'user'
            users.push({
                username: username,
                password: password, // Di aplikasi nyata, password harus di-hash!
                role: "user" 
            });
            localStorage.setItem('users', JSON.stringify(users));
            alert('Registrasi berhasil! Silakan login.');
            window.location.href = 'login.html'; // Redirect ke halaman login
        });
    }
});

// Fungsi untuk logout (bisa dipanggil dari mana saja)
function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
}

// Fungsi untuk mendapatkan user yang sedang login (termasuk role)
function getLoggedInUser() {
    return JSON.parse(localStorage.getItem('loggedInUser'));
}

// Fungsi untuk update profil (username/password)
function updateProfile(oldUsername, newUsername, newPassword) {
    let users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.username === oldUsername);

    if (userIndex > -1) {
        // Cek apakah username baru sudah ada oleh user lain
        if (newUsername && newUsername !== oldUsername) {
            const existingUser = users.find((u, idx) => u.username === newUsername && idx !== userIndex);
            if (existingUser) {
                return { success: false, message: 'Username baru sudah digunakan oleh pengguna lain!' };
            }
        }
        
        // Update username jika diisi
        if (newUsername) {
            users[userIndex].username = newUsername;
        }
        
        // Update password jika diisi
        if (newPassword) {
            users[userIndex].password = newPassword; // Di aplikasi nyata, password harus di-hash!
        }

        localStorage.setItem('users', JSON.stringify(users));
        // Update sesi user yang sedang login agar sesuai dengan perubahan terbaru
        localStorage.setItem('loggedInUser', JSON.stringify(users[userIndex]));
        return { success: true, message: 'Profil berhasil diperbarui! Silakan login kembali.' };
    }
    return { success: false, message: 'User tidak ditemukan.' };
}