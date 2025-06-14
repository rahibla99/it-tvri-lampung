document.addEventListener('DOMContentLoaded', () => {
    const currentUser = getLoggedInUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    const currentUserRole = currentUser.role;

    // Ambil ID surat tugas dari URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get('id');

    const detailAssignmentTitle = document.getElementById('detailAssignmentTitle');
    const detailMataAcara = document.getElementById('detailMataAcara');
    const detailJudulAcara = document.getElementById('detailJudulAcara');
    const detailTanggalMulai = document.getElementById('detailTanggalMulai');
    const detailTanggalSelesai = document.getElementById('detailTanggalSelesai');
    const detailStatus = document.getElementById('detailStatus');
    const detailCrewList = document.getElementById('detailCrewList');
    const detailBorrowedItemsTableBody = document.getElementById('detailBorrowedItemsTableBody');
    const noBorrowedItemsDetailMessage = document.getElementById('noBorrowedItemsDetailMessage');
    const assignmentActionsDiv = document.getElementById('assignmentActions');
    const completeAssignmentBtn = document.getElementById('completeAssignmentBtn');
    const cancelAssignmentBtn = document.getElementById('cancelAssignmentBtn');

    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let assignments = JSON.parse(localStorage.getItem('assignments')) || [];

    const saveInventory = () => {
        localStorage.setItem('inventory', JSON.stringify(inventory));
    };

    const saveAssignments = () => {
        localStorage.setItem('assignments', JSON.stringify(assignments));
    };

    const renderAssignmentDetail = () => {
        if (!assignmentId) {
            detailAssignmentTitle.textContent = 'Surat Tugas Tidak Ditemukan!';
            showToast('ID Surat Tugas tidak valid.', 'error');
            return;
        }

        const assignment = assignments.find(a => a.id === assignmentId);

        if (!assignment) {
            detailAssignmentTitle.textContent = 'Surat Tugas Tidak Ditemukan!';
            showToast('Surat Tugas tidak ditemukan.', 'error');
            return;
        }

        detailAssignmentTitle.textContent = `${assignment.mataAcara} - ${assignment.judulAcara}`;
        detailMataAcara.textContent = assignment.mataAcara;
        detailJudulAcara.textContent = assignment.judulAcara;
        detailTanggalMulai.textContent = assignment.tanggalMulai;
        detailTanggalSelesai.textContent = assignment.tanggalSelesai;
        detailStatus.textContent = assignment.status.toUpperCase();
        detailStatus.className = `status-badge status-${assignment.status}`; // Add class for styling

        detailCrewList.innerHTML = '';
        assignment.crew.forEach(crewMember => {
            const listItem = document.createElement('li');
            listItem.textContent = `${crewMember.username} (${crewMember.position})`;
            detailCrewList.appendChild(listItem);
        });

        // Tampilkan barang yang dipinjam untuk tugas ini
        detailBorrowedItemsTableBody.innerHTML = '';
        // Filter item dari inventory yang memiliki borrowHistory dengan assignmentId ini
        const borrowedItemsForThisAssignment = inventory.filter(item => 
            item.borrowHistory && item.borrowHistory.some(history => history.assignmentId === assignment.id)
        );

        if (borrowedItemsForThisAssignment.length === 0) {
            noBorrowedItemsDetailMessage.style.display = 'block';
        } else {
            noBorrowedItemsDetailMessage.style.display = 'none';
            // Untuk setiap item yang pernah dipinjam untuk tugas ini, cari record spesifiknya
            borrowedItemsForThisAssignment.forEach(item => {
                item.borrowHistory.filter(history => history.assignmentId === assignment.id).forEach(history => {
                    const row = detailBorrowedItemsTableBody.insertRow();
                    row.insertCell().textContent = item.jenis;
                    row.insertCell().textContent = item.name;
                    row.insertCell().textContent = item.tipe;
                    row.insertCell().textContent = history.startDate;
                    row.insertCell().textContent = history.conditionOnBorrow || '-';
                    row.insertCell().textContent = history.endDate || 'Belum Kembali';
                    row.insertCell().textContent = history.conditionOnReturn || '-';
                });
            });
        }

        // Tampilkan tombol aksi hanya untuk admin dan jika tugas belum selesai/dibatalkan
        if (currentUserRole === 'admin' && (assignment.status === 'active')) { // Tombol hanya muncul jika tugas AKTIF
            assignmentActionsDiv.style.display = 'flex';
        } else {
            assignmentActionsDiv.style.display = 'none';
        }
    };

    // Event listeners untuk tombol aksi admin
    completeAssignmentBtn.addEventListener('click', () => {
        const assignmentIndex = assignments.findIndex(a => a.id === assignmentId);
        if (assignmentIndex > -1) {
            // Pastikan semua barang yang dipinjam untuk tugas ini sudah dikembalikan
            const itemsCurrentlyBorrowedForThisAssignment = inventory.filter(item => 
                item.borrowHistory && item.borrowHistory.some(history => 
                    history.assignmentId === assignmentId && history.endDate === null
                )
            );

            if (itemsCurrentlyBorrowedForThisAssignment.length > 0) {
                showToast('Tidak bisa menandai selesai! Masih ada alat yang belum dikembalikan untuk tugas ini.', 'error');
                return;
            }

            if (confirm('Yakin tandai surat tugas ini sebagai SELESAI?')) { // Tambah konfirmasi
                assignments[assignmentIndex].status = 'completed';
                saveAssignments();
                showToast('Surat Tugas berhasil ditandai selesai!', 'success');
                renderAssignmentDetail(); // Render ulang detail
            }
        }
    });

    cancelAssignmentBtn.addEventListener('click', () => {
        const assignmentIndex = assignments.findIndex(a => a.id === assignmentId);
        if (assignmentIndex > -1) {
            const itemsCurrentlyBorrowedForThisAssignment = inventory.filter(item => 
                item.borrowHistory && item.borrowHistory.some(history => 
                    history.assignmentId === assignmentId && history.endDate === null
                )
            );

            if (itemsCurrentlyBorrowedForThisAssignment.length > 0) {
                showToast('Tidak bisa membatalkan tugas! Masih ada alat yang belum dikembalikan untuk tugas ini.', 'error');
                return;
            }

            if (confirm('Yakin ingin membatalkan surat tugas ini? Aksi ini tidak bisa diurungkan.')) {
                assignments[assignmentIndex].status = 'cancelled';
                saveAssignments();
                showToast('Surat Tugas berhasil dibatalkan!', 'success');
                renderAssignmentDetail(); // Render ulang detail
            }
        }
    });

    renderAssignmentDetail(); // Render detail saat halaman dimuat
});