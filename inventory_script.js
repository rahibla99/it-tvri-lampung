document.addEventListener('DOMContentLoaded', () => {
    // PENTING: Pastikan auth.js sudah di-load duluan
    const currentUser = getLoggedInUser();
    if (!currentUser) { 
        window.location.href = 'login.html';
        return;
    }
    const currentUserRole = currentUser.role;

    // Ambil elemen input baru
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
    const actionHeader = document.querySelector('#inventoryTable th:last-child');

    const searchBar = document.getElementById('searchBar');
    const filterJenisSelect = document.getElementById('filterJenis');

    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let editingIndex = -1;

    // --- Atur visibilitas fitur berdasarkan role ---
    if (currentUserRole === 'admin') {
        adminFeaturesDiv.style.display = 'block';
        actionHeader.style.display = 'table-cell'; // Tampilkan header 'Aksi'
    } else {
        adminFeaturesDiv.style.display = 'none';
        actionHeader.style.display = 'none'; // Sembunyikan header 'Aksi'
    }
    // --- Akhir pengaturan visibilitas ---

    // --- Elemen untuk Pop-up QR (Ambil dari HTML, tidak perlu createElement lagi) ---
    const qrModal = document.getElementById('qrModal');
    const closeButton = qrModal.querySelector('.close-button');
    const modalQrCodeDiv = document.getElementById('modalQrCode');
    const modalQrTextP = document.getElementById('modalQrText');

    closeButton.addEventListener('click', () => {
        qrModal.style.display = 'none';
        modalQrCodeDiv.innerHTML = '';
        qrModal.classList.remove('active');
    });

    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) { 
            qrModal.style.display = 'none';
            modalQrCodeDiv.innerHTML = '';
            qrModal.classList.remove('active');
        }
    });
    // --- Akhir Elemen Pop-up QR ---


    const saveInventory = () => {
        localStorage.setItem('inventory', JSON.stringify(inventory));
    };

    const resetForm = () => {
        itemJenisInput.value = '';
        itemNameInput.value = '';
        itemTipeInput.value = '';
        itemQuantityInput.value = '';
        itemKelengkapanInput.value = '';
        itemKondisiInput.value = '';
        itemDescriptionInput.value = '';
        submitItemBtn.textContent = 'Tambah Barang';
        editingIndex = -1;
        itemQuantityInput.disabled = false;
        itemJenisInput.disabled = false; // Aktifkan lagi
        itemNameInput.disabled = false; // Aktifkan lagi
        itemTipeInput.disabled = false; // Aktifkan lagi
    };

    const generateAndAppendQRCode = (cell, data) => {
        cell.innerHTML = '';
        const qrDiv = document.createElement('div');
        qrDiv.classList.add('table-qr-code');
        cell.appendChild(qrDiv);

        new QRCode(qrDiv, {
            text: data,
            width: 70,
            height: 70,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    };

    const showLargeQrCode = (data, itemName) => {
        modalQrCodeDiv.innerHTML = '';
        modalQrTextP.textContent = `QR Code untuk: ${itemName}`;
        new QRCode(modalQrCodeDiv, {
            text: data,
            width: 300,
            height: 300,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        qrModal.style.display = 'flex';
        qrModal.classList.add('active');
    };

    // Fungsi untuk memperbarui filter Jenis Barang
    const updateJenisFilterOptions = () => {
        const uniqueJenis = [...new Set(inventory.map(item => item.jenis))];
        filterJenisSelect.innerHTML = '<option value="">Semua Jenis</option>'; // Reset
        uniqueJenis.sort().forEach(jenis => {
            const option = document.createElement('option');
            option.value = jenis;
            option.textContent = jenis;
            filterJenisSelect.appendChild(option);
        });
    };

    const renderInventory = () => {
        inventoryTableBody.innerHTML = '';
        const searchTerm = searchBar.value.toLowerCase();
        const filterJenis = filterJenisSelect.value.toLowerCase();

        inventory.filter(item => {
            const matchesSearch = 
                item.name.toLowerCase().includes(searchTerm) ||
                item.jenis.toLowerCase().includes(searchTerm);
            const matchesFilter = filterJenis === '' || item.jenis.toLowerCase() === filterJenis;
            return matchesSearch && matchesFilter;
        }).forEach((item, index) => {
            const row = inventoryTableBody.insertRow();
            row.insertCell().textContent = item.jenis;
            row.insertCell().textContent = item.name;
            row.insertCell().textContent = item.tipe;
            row.insertCell().textContent = item.quantity;
            row.insertCell().textContent = item.kelengkapan;
            row.insertCell().textContent = item.kondisi;

            const qrCodeCell = row.insertCell();
            const qrData = `Nama: ${item.name}\nJenis: ${item.jenis}\nTipe: ${item.tipe}\nJumlah: ${item.quantity}\nKelengkapan: ${item.kelengkapan || '-'}\nKondisi: ${item.kondisi || '-'}\nDeskripsi: ${item.description || '-'}`;
            
            generateAndAppendQRCode(qrCodeCell, qrData);

            qrCodeCell.style.cursor = 'pointer';
            qrCodeCell.title = 'Klik untuk melihat QR Code besar';
            qrCodeCell.addEventListener('click', () => {
                showLargeQrCode(qrData, item.name);
            });

            const actionCell = row.insertCell();
            actionCell.classList.add('action-buttons');
            
            if (currentUserRole === 'admin') {
                actionCell.style.display = 'table-cell';
                // Tombol Kurang
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

                // Tombol Tambah
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
                    editingIndex = inventory.indexOf(item); // Dapatkan index yang akurat
                    itemJenisInput.value = item.jenis;
                    itemNameInput.value = item.name;
                    itemTipeInput.value = item.tipe;
                    itemQuantityInput.value = item.quantity;
                    itemKelengkapanInput.value = item.kelengkapan;
                    itemKondisiInput.value = item.kondisi;
                    itemDescriptionInput.value = item.description;

                    // Nonaktifkan input yang tidak boleh diubah saat edit
                    itemQuantityInput.disabled = true; 
                    itemJenisInput.disabled = true;
                    itemNameInput.disabled = true;
                    itemTipeInput.disabled = true;

                    submitItemBtn.textContent = 'Simpan Perubahan';
                };
                actionCell.appendChild(editBtn);

                // Tombol Hapus
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Hapus';
                deleteBtn.classList.add('delete-btn');
                deleteBtn.onclick = () => {
                    if (confirm(`Yakin ingin menghapus ${item.name}?`)) {
                        inventory.splice(index, 1);
                        saveInventory();
                        updateJenisFilterOptions(); // Perbarui filter setelah hapus
                        renderInventory();
                        resetForm();
                    }
                };
                actionCell.appendChild(deleteBtn);
            } else {
                actionCell.style.display = 'none';
            }
        });
    };

    submitItemBtn.addEventListener('click', () => {
        const jenis = itemJenisInput.value.trim();
        const name = itemNameInput.value.trim();
        const tipe = itemTipeInput.value.trim();
        const quantity = parseInt(itemQuantityInput.value);
        const kelengkapan = itemKelengkapanInput.value.trim();
        const kondisi = itemKondisiInput.value.trim();
        const description = itemDescriptionInput.value.trim();

        if (jenis && name && tipe && !isNaN(quantity) && quantity >= 0) {
            if (editingIndex > -1) {
                // Mode Edit: Hanya kelengkapan, kondisi, dan deskripsi yang bisa diubah via form ini
                inventory[editingIndex].kelengkapan = kelengkapan;
                inventory[editingIndex].kondisi = kondisi;
                inventory[editingIndex].description = description;
            } else {
                // Mode Tambah Barang Baru: Cek apakah nama, jenis, dan tipe sudah ada
                const existingItemIndex = inventory.findIndex(item => 
                    item.name.toLowerCase() === name.toLowerCase() &&
                    item.jenis.toLowerCase() === jenis.toLowerCase() &&
                    item.tipe.toLowerCase() === tipe.toLowerCase()
                );
                if (existingItemIndex > -1) {
                    // Jika barang dengan jenis, nama, tipe yang sama sudah ada, tambahkan jumlahnya
                    inventory[existingItemIndex].quantity += quantity;
                } else {
                    // Jika barang belum ada, tambahkan sebagai barang baru
                    inventory.push({ jenis, name, tipe, quantity, kelengkapan, kondisi, description });
                }
            }
            
            saveInventory();
            updateJenisFilterOptions(); // Perbarui filter setelah tambah/edit
            renderInventory();
            resetForm();
        } else {
            alert('Jenis, Nama, Tipe, dan Jumlah barang harus diisi dengan benar!');
        }
    });

    // Event listener untuk Search Bar
    searchBar.addEventListener('keyup', renderInventory);

    // Event listener untuk Filter Jenis Barang
    filterJenisSelect.addEventListener('change', renderInventory);

    // Initial render dan update filter options
    updateJenisFilterOptions();
    renderInventory();
});