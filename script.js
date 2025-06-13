document.addEventListener('DOMContentLoaded', () => {
    const itemNameInput = document.getElementById('itemName');
    const itemQuantityInput = document.getElementById('itemQuantity');
    const itemDescriptionInput = document.getElementById('itemDescription');
    const submitItemBtn = document.getElementById('submitItemBtn');
    const inventoryTableBody = document.querySelector('#inventoryTable tbody');

    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let editingIndex = -1;

    // --- Elemen untuk Pop-up QR ---
    const qrModal = document.createElement('div');
    qrModal.id = 'qrModal';
    qrModal.classList.add('qr-modal');
    qrModal.innerHTML = `
        <div class="qr-modal-content">
            <span class="close-button">&times;</span>
            <div id="modalQrCode" class="modal-qr-code"></div>
            <p id="modalQrText"></p>
        </div>
    `;
    document.body.appendChild(qrModal);

    const closeButton = qrModal.querySelector('.close-button');
    const modalQrCodeDiv = document.getElementById('modalQrCode');
    const modalQrTextP = document.getElementById('modalQrText');

    closeButton.addEventListener('click', () => {
        qrModal.style.display = 'none';
        modalQrCodeDiv.innerHTML = ''; // Bersihkan QR lama
    });

    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) { // Hanya tutup jika klik di luar konten
            qrModal.style.display = 'none';
            modalQrCodeDiv.innerHTML = ''; // Bersihkan QR lama
        }
    });
    // --- Akhir Elemen Pop-up QR ---


    const saveInventory = () => {
        localStorage.setItem('inventory', JSON.stringify(inventory));
    };

    const resetForm = () => {
        itemNameInput.value = '';
        itemQuantityInput.value = '';
        itemDescriptionInput.value = '';
        submitItemBtn.textContent = 'Tambah Barang';
        editingIndex = -1;
        itemQuantityInput.disabled = false;
    };

    // Fungsi untuk membuat dan menambahkan QR Code ke sel (ukuran tetap kecil di tabel)
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
            correctLevel : QRCode.CorrectLevel.H
        });
    };

    // Fungsi untuk menampilkan QR code di pop-up
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
    };


    const renderInventory = () => {
        inventoryTableBody.innerHTML = '';
        inventory.forEach((item, index) => {
            const row = inventoryTableBody.insertRow();
            row.insertCell().textContent = item.name;
            row.insertCell().textContent = item.quantity;
            row.insertCell().textContent = item.description;

            const qrCodeCell = row.insertCell();
            const qrData = `Nama: ${item.name}\nJumlah: ${item.quantity}\nDeskripsi: ${item.description || '-'}`;
            
            generateAndAppendQRCode(qrCodeCell, qrData); // QR kecil untuk tabel

            // --- Tambahkan Event Listener untuk Pop-up QR ---
            qrCodeCell.style.cursor = 'pointer'; // Agar terlihat bisa diklik
            qrCodeCell.title = 'Klik untuk melihat QR Code besar';
            qrCodeCell.addEventListener('click', () => {
                showLargeQrCode(qrData, item.name);
            });
            // --- Akhir Event Listener Pop-up QR ---

            const actionCell = row.insertCell();
            actionCell.classList.add('action-buttons'); // Tambahkan class untuk styling flexbox

            // ... (Kode tombol Kurang, Tambah, Edit, Hapus tetap sama) ...
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
                itemNameInput.value = item.name;
                itemQuantityInput.value = item.quantity;
                itemDescriptionInput.value = item.description;
                itemQuantityInput.disabled = true; 

                submitItemBtn.textContent = 'Simpan Perubahan';
                editingIndex = index;
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
                    renderInventory();
                    resetForm();
                }
            };
            actionCell.appendChild(deleteBtn);
        });
    };

    submitItemBtn.addEventListener('click', () => {
        const name = itemNameInput.value.trim();
        const quantity = parseInt(itemQuantityInput.value);
        const description = itemDescriptionInput.value.trim();

        if (name && (editingIndex !== -1 || (!isNaN(quantity) && quantity >= 0))) {
            if (editingIndex > -1) {
                inventory[editingIndex].name = name;
                inventory[editingIndex].description = description;
            } else {
                const existingItemIndex = inventory.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
                if (existingItemIndex > -1) {
                    inventory[existingItemIndex].quantity += quantity;
                } else {
                    inventory.push({ name, quantity, description });
                }
            }
            
            saveInventory();
            renderInventory();
            resetForm();
        } else {
            alert('Nama barang harus diisi. Untuk barang baru, jumlah juga harus diisi dengan benar!');
        }
    });

    renderInventory();
});