document.addEventListener('DOMContentLoaded', () => {
    const currentUser = getLoggedInUser();
    if (!currentUser || currentUser.role !== 'admin') {
        return; 
    }

    const assignmentForm = document.getElementById('assignmentForm');
    const mataAcaraInput = document.getElementById('mataAcara');
    const judulAcaraInput = document.getElementById('judulAcara');
    const tanggalMulaiInput = document.getElementById('tanggalMulai');
    const tanggalSelesaiInput = document.getElementById('tanggalSelesai');
    const crewListContainer = document.getElementById('crewList');
    const addCrewBtn = document.getElementById('addCrewBtn');

    let availableUsers = getAllUsers().filter(user => user.role === 'user' || user.role === 'admin');
    let crewCount = 0;

    const addCrewRow = (username = '', position = '') => {
        crewCount++;
        const crewRow = document.createElement('div');
        crewRow.classList.add('crew-row');
        crewRow.dataset.crewId = crewCount;

        let userOptions = availableUsers.map(user => 
            `<option value="${user.username}" ${user.username === username ? 'selected' : ''}>${user.username}</option>`
        ).join('');

        crewRow.innerHTML = `
            <div class="form-group crew-username-group">
                <label for="crewUsername_${crewCount}">Nama Crew</label>
                <select id="crewUsername_${crewCount}" required>
                    <option value="">Pilih User</option>
                    ${userOptions}
                </select>
            </div>
            <div class="form-group crew-position-group">
                <label for="crewPosition_${crewCount}">Posisi</label>
                <input type="text" id="crewPosition_${crewCount}" value="${position}" placeholder="Contoh: Kameramen" required>
            </div>
            <button type="button" class="remove-crew-btn modern-button delete-btn small-button">Hapus</button>
        `;
        crewListContainer.appendChild(crewRow);

        crewRow.querySelector('.remove-crew-btn').addEventListener('click', () => {
            crewRow.remove();
        });
    };

    addCrewRow();

    addCrewBtn.addEventListener('click', addCrewRow);

    assignmentForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const mataAcara = mataAcaraInput.value.trim();
        const judulAcara = judulAcaraInput.value.trim();
        const tanggalMulai = tanggalMulaiInput.value;
        const tanggalSelesai = tanggalSelesaiInput.value;

        if (new Date(tanggalMulai) > new Date(tanggalSelesai)) {
            showToast('Tanggal mulai tidak boleh lebih dari tanggal selesai!', 'error');
            return;
        }

        const crewMembers = [];
        let allCrewValid = true;
        document.querySelectorAll('.crew-row').forEach(row => {
            const usernameSelect = row.querySelector('select');
            const positionInput = row.querySelector('input');

            if (!usernameSelect.value || !positionInput.value.trim()) {
                allCrewValid = false;
                showToast('Semua nama crew dan posisi harus diisi!', 'error');
                return;
            }
            crewMembers.push({
                username: usernameSelect.value,
                position: positionInput.value.trim()
            });
        });

        if (!allCrewValid) {
            return;
        }
        
        if (crewMembers.length === 0) {
            showToast('Setidaknya harus ada satu crew yang terlibat!', 'error');
            return;
        }

        const assignmentId = 'ST-' + Date.now(); 

        const newAssignment = {
            id: assignmentId,
            mataAcara: mataAcara,
            judulAcara: judulAcara,
            tanggalMulai: tanggalMulai,
            tanggalSelesai: tanggalSelesai,
            crew: crewMembers,
            status: 'active', // Status surat tugas: active, completed, cancelled
            borrowedItems: [] // Tambahkan ini agar lebih mudah melacak item yang dipinjam untuk tugas ini
        };

        let assignments = JSON.parse(localStorage.getItem('assignments')) || [];
        assignments.push(newAssignment);
        localStorage.setItem('assignments', JSON.stringify(assignments));

        showToast('Surat Tugas berhasil disimpan!', 'success');
        assignmentForm.reset();
        crewListContainer.innerHTML = ''; // Kosongkan crew list
        crewCount = 0; // Reset crew counter
        addCrewRow(); // Tambah satu baris crew kosong lagi
    });
});