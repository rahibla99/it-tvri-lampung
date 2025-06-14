document.addEventListener('DOMContentLoaded', () => {
    // PENTING: Pastikan auth.js sudah di-load duluan di HTML
    const currentUser = getLoggedInUser();
    if (!currentUser) { 
        window.location.href = 'login.html';
        return;
    }
    const currentUserRole = currentUser.role;

    // Ambil elemen input untuk form inventaris
    const itemJenisInput = document.getElementById('itemJenis');
    const itemNameInput = document.getElementById('itemName');
    const itemTipeInput = document.getElementById('itemTipe');
    const itemQuantityInput = document.getElementById('itemQuantity');
    const itemKelengkapanInput = document.getElementById('itemKelengkapan');
    const itemKondisiInput = document.getElementById('itemKondisi');
    const itemDescriptionInput = document.getElementById('itemDescription'); // Deskripsi tambahan

    const submitItemBtn = document.getElementById('submitItemBtn');
    const inventoryTableBody = document.querySelector('#inventoryTable tbody');
    const adminFeaturesDiv = document.getElementById('adminFeatures');
    const actionHeader = document.querySelector('#inventoryTable thead tr th:last-child'); // Kolom Aksi di header

    // Elemen untuk fitur Search & Filter
    const searchBar = document.getElementById('searchBar');
    const filterJenisSelect = document.getElementById('filterJenis');

    // Data inventaris dari localStorage
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let editingIndex = -1; // Untuk melacak item yang sedang diedit

    // --- Atur visibilitas fitur input barang berdasarkan role ---
    if (currentUserRole === 'admin') {
        adminFeaturesDiv.style.display = 'block';
    } else {
        adminFeaturesDiv.style.display = 'none';
    }
    // --- Akhir pengaturan visibilitas ---

    // --- Elemen untuk Pop-up QR Code (diambil dari HTML) ---
    const qrModal = document.getElementById('qrModal');
    const closeButton = qrModal.querySelector('.close-button');
    const modalQrCodeDiv = document.getElementById('modalQrCode');
    const modalQrTextP = document.getElementById('modalQrText');

    // Event listener untuk menutup modal QR
    closeButton.addEventListener('click', () => {
        qrModal.style.display = 'none';
        modalQrCodeDiv.innerHTML = ''; // Bersihkan QR lama
        qrModal.classList.remove('active'); // Hapus class active untuk animasi
    });

    // Tutup modal jika klik di area luar konten modal
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) { 
            qrModal.style.display = 'none';
            modalQrCodeDiv.innerHTML = '';
            qrModal.classList.remove('active');
        }
    });
    // --- Akhir Elemen Pop-up QR ---

    // --- Elemen untuk Riwayat Peminjaman Modal (diambil dari HTML) ---
    const historyModal = document.getElementById('historyModal');
    const historyCloseButton = historyModal.querySelector('.history-close-button');
    const historyItemNameSpan = document.getElementById('historyItemName');
    const historyTableBody = document.getElementById('historyTableBody');
    const historyEmptyMessage = document.getElementById('historyEmptyMessage');
    const historyTableHeaderRow = document.querySelector('#historyModal .history-list-table thead tr'); // Ambil header tabel riwayat

    // Event listener untuk menutup modal Riwayat Peminjaman
    historyCloseButton.addEventListener('click', () => {
        historyModal.style.display = 'none';
        historyModal.classList.remove('active');
    });

    // Tutup modal jika klik di area luar konten modal
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            historyModal.style.display = 'none';
            historyModal.classList.remove('active');
        }
    });

    // Fungsi untuk menampilkan modal riwayat peminjaman
    const showBorrowHistory = (item) => {
        historyItemNameSpan.textContent = item.name;
        historyTableBody.innerHTML = ''; // Kosongkan tabel riwayat

        // !!! PERBAIKAN PENTING: Pastikan header kolom 'Keperluan' diubah menjadi 'Mata Acara' !!!
        if (historyTableHeaderRow && historyTableHeaderRow.cells.length > 3) {
            historyTableHeaderRow.cells[3].textContent = 'Mata Acara'; // Index 3 adalah 'Keperluan'
        }
        
        if (item.borrowHistory && item.borrowHistory.length > 0) {
            historyEmptyMessage.style.display = 'none';
            item.borrowHistory.forEach(history => {
                const row = historyTableBody.insertRow();
                row.insertCell().textContent = history.borrower;
                row.insertCell().textContent = history.startDate;
                row.insertCell().textContent = history.endDate || 'Belum Kembali';
                row.insertCell().textContent = history.assignmentTitle || '-'; // Gunakan assignmentTitle
                row.insertCell().textContent = history.conditionOnBorrow || '-';
                row.insertCell().textContent = history.conditionOnReturn || '-';
            });
        } else {
            historyEmptyMessage.style.display = 'block';
            // Pastikan header kembali ke 'Keperluan' jika tidak ada riwayat (opsional, tapi konsisten)
            const tableHeaderRow = historyTableBody.parentNode.querySelector('thead tr');
            tableHeaderRow.cells[3].textContent = 'Keperluan';
        }
        historyModal.style.display = 'flex';
        historyModal.classList.add('active'); // Tambah class active untuk animasi
    };
    // --- Akhir Elemen Riwayat Peminjaman Modal ---


    // Fungsi untuk menyimpan data inventaris ke localStorage
    const saveInventory = () => {
        localStorage.setItem('inventory', JSON.stringify(inventory));
    };

    // Fungsi untuk mereset form input inventaris
    const resetForm = () => {
        itemJenisInput.value = '';
        itemNameInput.value = '';
        itemTipeInput.value = '';
        itemQuantityInput.value = '';
        itemKelengkapanInput.value = '';
        itemKondisiInput.value = '';
        itemDescriptionInput.value = '';
        submitItemBtn.textContent = 'Tambah Barang'; // Kembalikan teks tombol
        editingIndex = -1; // Reset index yang sedang diedit

        // Aktifkan kembali input yang mungkin dinonaktifkan saat edit
        itemQuantityInput.disabled = false;
        itemJenisInput.disabled = false;
        itemNameInput.disabled = false;
        itemTipeInput.disabled = false;
    };

    // Fungsi untuk membuat dan menambahkan QR Code ke sel tabel
    const generateAndAppendQRCode = (cell, data) => {
        cell.innerHTML = '';
        const qrDiv = document.createElement('div');
        qrDiv.classList.add('table-qr-code'); // Tambahkan class untuk styling
        cell.appendChild(qrDiv);

        new QRCode(qrDiv, {
            text: data,
            width: 70, // Ukuran kecil untuk di tabel
            height: 70,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H // Tingkat koreksi error (H = High)
        });
    };

    // Fungsi untuk menampilkan QR code di pop-up besar
    const showLargeQrCode = (data, itemName) => {
        modalQrCodeDiv.innerHTML = ''; // Kosongkan dulu
        modalQrTextP.textContent = `QR Code untuk: ${itemName}`;
        new QRCode(modalQrCodeDiv, {
            text: data,
            width: 300, // Ukuran besar untuk pop-up
            height: 300,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        qrModal.style.display = 'flex'; // Tampilkan modal
        qrModal.classList.add('active'); // Tambahkan class active untuk animasi
    };

    // Fungsi untuk memperbarui opsi filter Jenis Barang
    const updateJenisFilterOptions = () => {
        const uniqueJenis = [...new Set(inventory.map(item => item.jenis))];
        filterJenisSelect.innerHTML = '<option value="">Semua Jenis</option>'; // Reset dropdown
        uniqueJenis.sort().forEach(jenis => {
            const option = document.createElement('option');
            option.value = jenis;
            option.textContent = jenis;
            filterJenisSelect.appendChild(option);
        });
    };

    // Fungsi utama untuk me-render data inventaris ke tabel
    const renderInventory = () => {
        inventoryTableBody.innerHTML = ''; // Kosongkan tabel sebelum merender ulang
        const searchTerm = searchBar.value.toLowerCase();
        const filterJenis = filterJenisSelect.value.toLowerCase();

        // Filter data berdasarkan search term dan filter jenis
        inventory.filter(item => {
            const matchesSearch = 
                item.name.toLowerCase().includes(searchTerm) ||
                item.jenis.toLowerCase().includes(searchTerm); // Cari di nama atau jenis
            const matchesFilter = filterJenis === '' || item.jenis.toLowerCase() === filterJenis; // Filter jenis
            return matchesSearch && matchesFilter;
        }).forEach((item, index) => {
            // Inisialisasi status dan riwayat jika belum ada (untuk data lama)
            if (!item.status) {
                item.status = 'available';
            }
            if (!item.borrowHistory) {
                item.borrowHistory = [];
            }
            // Tambahkan ID unik jika belum ada (penting untuk referensi peminjaman)
            if (!item.id) {
                item.id = 'ITEM-' + Date.now() + Math.random().toString(36).substring(2, 9);
                saveInventory(); // Simpan jika ada item baru dengan ID yang digenerate
            }


            const row = inventoryTableBody.insertRow();
            // !!! PERBAIKAN PENTING: Tambah class stabilo ke setiap baris di sini !!!
            row.classList.add(`status-${item.status}`); // Tambah class untuk highlight baris

            // Masukkan data ke setiap sel
            row.insertCell().textContent = item.jenis;
            row.insertCell().textContent = item.name;
            row.insertCell().textContent = item.tipe;
            row.insertCell().textContent = item.quantity;
            row.insertCell().textContent = item.kelengkapan;
            row.insertCell().textContent = item.kondisi; // Kondisi terbaru dari objek item

            // Kolom Status (dengan icon)
            const statusCell = row.insertCell();
            statusCell.classList.add('status-cell'); // Tambahkan class untuk styling status cell
            if (item.status === 'available') {
                statusCell.innerHTML = '<i class="fas fa-check-circle"></i> Tersedia';
            } else { // status === 'borrowed'
                statusCell.innerHTML = '<i class="fas fa-times-circle"></i> Dipinjam';
            }

            // Kolom QR Code
            const qrCodeCell = row.insertCell();
            // Data yang di-encode ke QR Code, mencakup semua detail barang
            const qrData = `Nama: ${item.name}\nJenis: ${item.jenis}\nTipe: ${item.tipe}\nJumlah: ${item.quantity}\nKelengkapan: ${item.kelengkapan || '-'}\nKondisi: ${item.kondisi || '-'}\nStatus: ${item.status}\nDeskripsi: ${item.description || '-'}\nID: ${item.id}`;
            
            generateAndAppendQRCode(qrCodeCell, qrData); // Generate QR kecil untuk tabel

            // Atur agar QR Code bisa diklik untuk pop-up besar
            qrCodeCell.style.cursor = 'pointer';
            qrCodeCell.title = 'Klik untuk melihat QR Code besar';
            qrCodeCell.addEventListener('click', () => {
                showLargeQrCode(qrData, item.name);
            });

            // Kolom Aksi (Edit, Hapus, +/-)
            const actionCell = row.insertCell();
            actionCell.classList.add('action-buttons'); // Tambahkan class untuk styling flexbox tombol

            // --- Event listener untuk klik baris (untuk riwayat peminjaman) ---
            // Kecuali kolom aksi, QR, dan Status
            Array.from(row.cells).forEach((cell, cellIndex) => {
                // Kolom Aksi: index 8
                // Kolom QR: index 7
                // Kolom Status: index 6
                // Ini berarti kita ingin event listener di index 0-5
                if (cellIndex < 6) { 
                    cell.addEventListener('click', () => {
                        showBorrowHistory(item); // Tampilkan riwayat peminjaman saat baris diklik
                    });
                    cell.style.cursor = 'pointer'; // Tunjukkan bahwa baris bisa diklik
                } else { // Kolom Status, QR, dan Aksi tidak bisa diklik untuk riwayat
                    cell.style.cursor = 'default';
                }
            });
            // --- Akhir Event listener klik baris ---

            // Tampilkan tombol aksi hanya jika user adalah admin
            if (currentUserRole === 'admin') {
                actionCell.style.display = 'table-cell'; // Pastikan sel aksi terlihat untuk admin

                // Tombol Kurang Jumlah
                const decreaseBtn = document.createElement('button');
                decreaseBtn.textContent = '-';
                decreaseBtn.classList.add('update-btn');
                decreaseBtn.onclick = () => {
                    if (item.quantity > 0) {
                        item.quantity--;
                        saveInventory();
                        renderInventory();
                    }
                };
                actionCell.appendChild(decreaseBtn);

                // Tombol Tambah Jumlah
                const increaseBtn = document.createElement('button');
                increaseBtn.textContent = '+';
                increaseBtn.classList.add('update-btn');
                increaseBtn.onclick = () => {
                    item.quantity++;
                    saveInventory();
                    renderInventory();
                };
                actionCell.appendChild(increaseBtn);

                // Tombol Edit
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.classList.add('update-btn');
                editBtn.onclick = () => {
                    editingIndex = inventory.indexOf(item); // Dapatkan index yang akurat dari array inventaris
                    // Isi form input dengan data item yang akan diedit
                    itemJenisInput.value = item.jenis;
                    itemNameInput.value = item.name;
                    itemTipeInput.value = item.tipe;
                    itemQuantityInput.value = item.quantity;
                    itemKelengkapanInput.value = item.kelengkapan;
                    itemKondisiInput.value = item.kondisi; // Isi dengan kondisi terbaru dari item
                    itemDescriptionInput.value = item.description;

                    // Nonaktifkan input yang tidak boleh diubah saat edit (identitas barang)
                    itemQuantityInput.disabled = true; 
                    itemJenisInput.disabled = true;
                    itemNameInput.disabled = true;
                    itemTipeInput.disabled = true;

                    submitItemBtn.textContent = 'Simpan Perubahan'; // Ubah teks tombol
                };
                actionCell.appendChild(editBtn);

                // Tombol Hapus
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Hapus';
                deleteBtn.classList.add('delete-btn');
                deleteBtn.onclick = () => {
                    if (confirm(`Yakin ingin menghapus ${item.name}?`)) {
                        inventory.splice(index, 1); // Hapus item dari array
                        saveInventory();
                        updateJenisFilterOptions(); // Perbarui opsi filter setelah penghapusan
                        renderInventory(); // Render ulang tabel
                        resetForm(); // Bersihkan form
                    }
                };
                actionCell.appendChild(deleteBtn);
            } else {
                actionCell.style.display = 'none'; // Sembunyikan sel aksi untuk user biasa
            }

            // Pastikan kolom Aksi (header) juga disembunyikan jika bukan admin
            if (currentUserRole !== 'admin') {
                if (actionHeader) actionHeader.style.display = 'none'; // Sembunyikan header aksi
            } else {
                if (actionHeader) actionHeader.style.display = 'table-cell'; // Tampilkan header aksi
            }
        });
    };

    // Event listener untuk tombol 'Tambah Barang'/'Simpan Perubahan'
    submitItemBtn.addEventListener('click', () => {
        const jenis = itemJenisInput.value.trim();
        const name = itemNameInput.value.trim();
        const tipe = itemTipeInput.value.trim();
        const quantity = parseInt(itemQuantityInput.value);
        const kelengkapan = itemKelengkapanInput.value.trim();
        const kondisi = itemKondisiInput.value.trim();
        const description = itemDescriptionInput.value.trim();

        // Validasi input form
        if (jenis && name && tipe && !isNaN(quantity) && quantity >= 0) {
            if (editingIndex > -1) {
                // Mode Edit: Hanya kelengkapan, kondisi, dan deskripsi yang bisa diubah via form ini
                inventory[editingIndex].kelengkapan = kelengkapan;
                inventory[editingIndex].kondisi = kondisi; // Update kondisi barang
                inventory[editingIndex].description = description;
                showToast('Barang berhasil diperbarui!', 'success');
            } else {
                // Mode Tambah Barang Baru: Cek apakah barang dengan jenis, nama, dan tipe yang sama sudah ada
                const existingItemIndex = inventory.findIndex(item => 
                    item.name.toLowerCase() === name.toLowerCase() &&
                    item.jenis.toLowerCase() === jenis.toLowerCase() &&
                    item.tipe.toLowerCase() === tipe.toLowerCase()
                );
                if (existingItemIndex > -1) {
                    // Jika barang sudah ada, tambahkan jumlahnya
                    inventory[existingItemIndex].quantity += quantity;
                    showToast('Jumlah barang yang sudah ada berhasil ditambahkan!', 'success');
                } else {
                    // Jika barang belum ada, tambahkan sebagai barang baru
                    inventory.push({ 
                        id: 'ITEM-' + Date.now() + Math.random().toString(36).substring(2, 9), // ID unik
                        jenis, name, tipe, quantity, kelengkapan, kondisi, description, 
                        status: 'available', // Default status: tersedia
                        borrowHistory: [] // Riwayat peminjaman kosong
                    });
                    showToast('Barang baru berhasil ditambahkan!', 'success');
                }
            }
            
            saveInventory(); // Simpan perubahan ke localStorage
            updateJenisFilterOptions(); // Perbarui opsi filter setelah tambah/edit
            renderInventory(); // Render ulang tabel
            resetForm(); // Bersihkan form
        } else {
            showToast('Jenis, Nama, Tipe, dan Jumlah barang harus diisi dengan benar!', 'error'); // Pakai toast
        }
    });

    // Event listener untuk Search Bar (keyup: setiap kali ketikan)
    searchBar.addEventListener('keyup', renderInventory);

    // Event listener untuk Filter Jenis Barang (change: saat pilihan berubah)
    filterJenisSelect.addEventListener('change', renderInventory);

    // Initial render dan update filter options saat halaman pertama kali dimuat
    updateJenisFilterOptions();
    renderInventory();
});