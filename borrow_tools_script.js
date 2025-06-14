document.addEventListener('DOMContentLoaded', () => {
    const currentUser = getLoggedInUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    const currentUsername = currentUser.username;

    const myAssignmentsListDiv = document.getElementById('myAssignmentsList');
    const noAssignmentsMessage = document.getElementById('noAssignmentsMessage');
    const borrowReturnSection = document.getElementById('borrowReturnSection');
    const currentAssignmentTitleSpan = document.getElementById('currentAssignmentTitle');
    
    const borrowSearchBar = document.getElementById('borrowSearchBar');
    const borrowFilterJenisSelect = document.getElementById('borrowFilterJenis');
    const availableItemsTableBody = document.querySelector('#availableItemsTable tbody');
    const noAvailableItemsMessage = document.getElementById('noAvailableItemsMessage');
    const borrowedItemsTableBody = document.querySelector('#borrowedItemsTable tbody');
    const noBorrowedItemsMessage = document.getElementById('noBorrowedItemsMessage');

    const confirmBorrowModal = document.getElementById('confirmBorrowModal');
    const confirmItemNameSpan = document.getElementById('confirmItemName');
    const initialConditionInput = document.getElementById('initialCondition');
    const confirmBorrowBtn = document.getElementById('confirmBorrowBtn');

    const confirmReturnModal = document.getElementById('confirmReturnModal');
    const returnItemNameSpan = document.getElementById('returnItemName');
    const borrowedConditionSpan = document.getElementById('borrowedConditionSpan');
    const returnConditionInput = document.getElementById('returnCondition');
    const confirmReturnBtn = document.getElementById('confirmReturnBtn');

    const borrowScanModal = document.getElementById('borrowScanModal');
    const scanCloseButton = borrowScanModal.querySelector('.scan-close-button');
    const borrowReaderDiv = document.getElementById('borrowReader'); // Div untuk render kamera
    const borrowQrFileInput = document.getElementById('borrow-qr-file-input'); // Input file untuk upload gambar
    const scanFeedback = document.getElementById('scanFeedback'); // Pesan feedback umum
    const scanFeedbackCamera = document.getElementById('scanFeedbackCamera'); // Pesan feedback khusus kamera
    const scanFeedbackFile = document.getElementById('scanFeedbackFile'); // Pesan feedback khusus file

    // --- Elemen Pilihan Scan BARU ---
    const scanOptionsDiv = document.getElementById('scanOptions');
    const chooseCameraScanBtn = document.getElementById('chooseCameraScanBtn');
    const chooseFileScanBtn = document.getElementById('chooseFileScanBtn');
    const cameraScanArea = document.getElementById('cameraScanArea');
    const fileScanArea = document.getElementById('fileScanArea');

    let html5BorrowQrCode = null; // Inisialisasi scanner untuk modal borrow
    let pendingScanAction = ''; // 'borrow' atau 'return', untuk dibawa dari tombol awal

    const qrCodeConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        aspectRatio: 1.777,
        disableFlip: false
    };

    let selectedAssignmentId = null;
    let selectedItemForBorrow = null;
    let selectedItemForReturn = null;
    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];
    let assignments = JSON.parse(localStorage.getItem('assignments')) || [];

    const getTodayDate = () => {
        const today = new Date();
        const sepanjang = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${sepanjang}-${mm}-${dd}`;
    };

    const saveInventory = () => {
        localStorage.setItem('inventory', JSON.stringify(inventory));
    };

    const saveAssignments = () => {
        localStorage.setItem('assignments', JSON.stringify(assignments));
    };

    // Close all confirmation modals
    document.querySelectorAll('.confirm-close-button').forEach(button => {
        button.addEventListener('click', () => {
            confirmBorrowModal.style.display = 'none';
            confirmBorrowModal.classList.remove('active');
            confirmReturnModal.style.display = 'none';
            confirmReturnModal.classList.remove('active');
        });
    });

    confirmBorrowModal.addEventListener('click', (e) => {
        if (e.target === confirmBorrowModal) {
            confirmBorrowModal.style.display = 'none';
            confirmBorrowModal.classList.remove('active');
        }
    });
    confirmReturnModal.addEventListener('click', (e) => {
        if (e.target === confirmReturnModal) {
            confirmReturnModal.style.display = 'none';
            confirmReturnModal.classList.remove('active');
        }
    });

    // --- Logika Utama Modal Scan QR ---
    const openBorrowScanModal = (action) => { // Fungsi ini membuka modal dengan pilihan
        pendingScanAction = action; // Simpan aksi yang akan dilakukan setelah scan
        borrowScanModal.style.display = 'flex';
        borrowScanModal.classList.add('active');
        scanFeedback.textContent = ''; // Reset feedback umum

        // Sembunyikan semua area scan dan pilihan di awal
        scanOptionsDiv.style.display = 'block';
        cameraScanArea.style.display = 'none';
        fileScanArea.style.display = 'none';
        borrowReaderDiv.innerHTML = ''; // Bersihkan reader
        scanFeedbackCamera.textContent = ''; // Reset feedback kamera
        scanFeedbackFile.textContent = ''; // Reset feedback file

        stopBorrowScanner(); // Pastikan scanner mati jika ada dari sesi sebelumnya
    };

    // Event listener untuk tombol "Scan dengan Kamera" di dalam modal
    chooseCameraScanBtn.addEventListener('click', () => {
        scanOptionsDiv.style.display = 'none'; // Sembunyikan pilihan
        cameraScanArea.style.display = 'block'; // Tampilkan area kamera
        scanFeedbackCamera.textContent = ''; // Reset feedback kamera

        if (!borrowReaderDiv) {
            console.error("borrowReaderDiv not found, cannot start camera.");
            scanFeedbackCamera.textContent = 'Error: Elemen kamera tidak ditemukan.';
            showToast('Error: Elemen kamera tidak ditemukan.', 'error');
            return;
        }

        if (!html5BorrowQrCode) {
            html5BorrowQrCode = new Html5Qrcode("borrowReader");
            console.log("Html5Qrcode for borrow modal initialized.");
        }

        // Mulai kamera
        html5BorrowQrCode.start(
            { facingMode: "environment" }, // Gunakan kamera belakang
            qrCodeConfig,
            onScanSuccessBorrow,
            onScanErrorBorrow
        ).catch(err => {
            console.error("Gagal memulai scanner kamera:", err);
            scanFeedbackCamera.textContent = 'Gagal mengakses kamera. Pastikan izin kamera diberikan.';
            showToast('Gagal mengakses kamera di modal scan.', 'error');
        });
    });

    // Event listener untuk tombol "Pilih dari Galeri" di dalam modal
    chooseFileScanBtn.addEventListener('click', () => {
        scanOptionsDiv.style.display = 'none'; // Sembunyikan pilihan
        fileScanArea.style.display = 'block'; // Tampilkan area upload file
        scanFeedbackFile.textContent = ''; // Reset feedback file
    });


    const stopBorrowScanner = () => {
        if (html5BorrowQrCode && html5BorrowQrCode.isScanning) {
            html5BorrowQrCode.stop().then(() => {
                console.log("Borrow scanner stopped.");
                if (borrowReaderDiv) {
                    borrowReaderDiv.innerHTML = ''; // Clear video stream
                    // borrowReaderDiv.style.display = 'none'; // html5-qrcode handle ini
                }
            }).catch(err => console.error("Error stopping borrow scanner:", err));
        }
    };

    const onScanSuccessBorrow = (decodedText, decodedResult) => {
        stopBorrowScanner(); // Hentikan scanner setelah berhasil scan
        borrowScanModal.style.display = 'none'; // Sembunyikan modal scan
        borrowScanModal.classList.remove('active');
        
        console.log(`Scanned QR: ${decodedText}`);

        const scannedItemData = parseQrData(decodedText);
        const scannedItemId = scannedItemData.id;

        if (!scannedItemId) {
            showToast('QR Code tidak valid: ID barang tidak ditemukan.', 'error');
            return;
        }

        const item = inventory.find(i => i.id === scannedItemId);

        if (!item) {
            showToast('Barang tidak ditemukan di inventaris.', 'error');
            return;
        }

        // Logic otomatis deteksi apakah ini pinjam atau kembalikan berdasarkan status barang
        if (item.status === 'available' && item.quantity > 0) {
            if (!selectedAssignmentId) { 
                showToast('Pilih surat tugas terlebih dahulu untuk meminjam alat ini!', 'error');
                return;
            }
            selectedItemForBorrow = item;
            confirmItemNameSpan.textContent = `${item.name} (${item.tipe})`;
            initialConditionInput.value = item.kondisi; 
            confirmBorrowModal.style.display = 'flex';
            confirmBorrowModal.classList.add('active');
            showToast(`Alat ${item.name} terdeteksi, siap dipinjam.`, 'success');

        } else if (item.status === 'borrowed') {
            const activeHistory = item.borrowHistory.find(history => 
                history.borrower === currentUsername && history.endDate === null
            );
            if (!activeHistory) { 
                showToast(`Alat ${item.name} (${item.tipe}) tidak dipinjam oleh Anda atau sudah dikembalikan.`, 'error');
                return;
            }

            selectedItemForReturn = item;
            returnItemNameSpan.textContent = `${item.name} (${item.tipe})`;
            borrowedConditionSpan.textContent = activeHistory.conditionOnBorrow;
            returnConditionInput.value = activeHistory.conditionOnReturn || activeHistory.conditionOnBorrow;
            confirmReturnModal.style.display = 'flex';
            confirmReturnModal.classList.add('active');
            showToast(`Alat ${item.name} terdeteksi, siap dikembalikan.`, 'success');

        } else if (item.status === 'available' && item.quantity === 0) {
            showToast(`Alat ${item.name} sudah habis (0).`, 'error');
        } else {
            showToast(`Status alat ${item.name} (${item.tipe}) tidak memungkinkan aksi pinjam/kembali.`, 'error');
        }
    };

    const onScanErrorBorrow = (errorMessage) => {
        // console.warn(`Borrow scan error: ${errorMessage}`);
        scanFeedbackCamera.textContent = 'Gagal memindai. Pastikan QR code jelas.'; // Feedback di area kamera
    };

    scanCloseButton.addEventListener('click', () => {
        stopBorrowScanner(); // Pastikan scanner berhenti
        borrowScanModal.style.display = 'none';
        borrowScanModal.classList.remove('active');
    });

    borrowScanModal.addEventListener('click', (e) => {
        if (e.target === borrowScanModal) {
            stopBorrowScanner(); // Pastikan scanner berhenti
            borrowScanModal.style.display = 'none';
            borrowScanModal.classList.remove('active');
        }
    });

    borrowQrFileInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) return;
        const imageFile = e.target.files[0];
        scanFeedbackFile.textContent = 'Memindai gambar...'; // Feedback di area file

        stopBorrowScanner(); // Pastikan kamera mati jika ada

        if (!html5BorrowQrCode) { 
            html5BorrowQrCode = new Html5Qrcode("borrowReader");
            console.log("Html5Qrcode for borrow modal initialized for file scan.");
        }
        
        // Pastikan div borrowReaderDiv bersih dan terlihat untuk menampilkan gambar
        if (borrowReaderDiv) {
             borrowReaderDiv.innerHTML = ''; 
             borrowReaderDiv.style.display = 'block'; // Make sure it's visible for image rendering
        } else {
             console.error("borrowReaderDiv not found for file scan.");
             scanFeedbackFile.textContent = 'Error: Elemen scanner tidak ditemukan untuk scan gambar.';
             showToast('Error: Elemen scanner tidak ditemukan.', 'error');
             e.target.value = '';
             return;
        }

        html5BorrowQrCode.scanFile(imageFile, true) // true untuk menampilkan gambar di readerDiv
            .then(decodedText => {
                onScanSuccessBorrow(decodedText, {});
                scanFeedbackFile.textContent = '';
            })
            .catch(err => {
                console.error(`Error scanning file: ${err}`);
                scanFeedbackFile.textContent = `Gagal memindai gambar QR: ${err.message || err}`;
                showToast(`Gagal memindai gambar QR: ${err.message || err}`, 'error');
            })
            .finally(() => {
                e.target.value = ''; // Reset input file
                if (borrowReaderDiv) {
                     borrowReaderDiv.innerHTML = ''; // Clear temporary image
                     borrowReaderDiv.style.display = 'none'; // Sembunyikan setelah selesai
                }
            });
    });

    const parseQrData = (qrText) => {
        const data = {};
        qrText.split('\n').forEach(line => {
            const parts = line.split(': ');
            if (parts.length > 1) {
                const key = parts[0].trim().replace(/\s/g, '');
                data[key.toLowerCase()] = parts.slice(1).join(': ').trim();
            }
        });
        return data;
    };

    const scanBorrowToolBtn = document.getElementById('scanBorrowToolBtn');
    if (scanBorrowToolBtn) {
        scanBorrowToolBtn.addEventListener('click', () => openBorrowScanModal('borrow'));
    } else {
        console.error("scanBorrowToolBtn not found. Ensure ID is correct in HTML.");
    }

    const scanReturnToolBtn = document.getElementById('scanReturnToolBtn');
    if (scanReturnToolBtn) {
        scanReturnToolBtn.addEventListener('click', () => openBorrowScanModal('return'));
    } else {
        console.error("scanReturnToolBtn not found. Ensure ID is correct in HTML.");
    }

    // --- RENDERING SURAT TUGAS SAYA ---
    const renderMyAssignments = () => {
        myAssignmentsListDiv.innerHTML = '';
        const myAssignments = assignments.filter(assignment => 
            assignment.crew.some(crewMember => crewMember.username === currentUsername) &&
            assignment.status === 'active' // Hanya tampilkan surat tugas yang aktif
        );

        if (myAssignments.length === 0) {
            noAssignmentsMessage.style.display = 'block';
            return;
        } else {
            noAssignmentsMessage.style.display = 'none';
        }

        myAssignments.forEach(assignment => {
            const assignmentCard = document.createElement('div');
            assignmentCard.classList.add('assignment-card');
            assignmentCard.innerHTML = `
                <h3>${assignment.mataAcara} - ${assignment.judulAcara}</h3>
                <p><strong>Periode:</strong> ${assignment.tanggalMulai} s/d ${assignment.tanggalSelesai}</p>
                <p><strong>Crew:</strong> ${assignment.crew.map(c => `${c.username} (${c.position})`).join(', ')}</p>
                <button class="select-assignment-btn modern-button small-button" data-assignment-id="${assignment.id}">Pilih untuk Peminjaman</button>
            `;
            myAssignmentsListDiv.appendChild(assignmentCard);
        });

        document.querySelectorAll('.select-assignment-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                selectedAssignmentId = e.target.dataset.assignmentId;
                const assignment = assignments.find(a => a.id === selectedAssignmentId);
                if (assignment) {
                    currentAssignmentTitleSpan.textContent = `${assignment.mataAcara} - ${assignment.judulAcara}`;
                    borrowReturnSection.style.display = 'block';
                    renderAvailableItems();
                    renderBorrowedItems();
                    updateBorrowFilterOptions();
                    borrowReturnSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    };

    // --- RENDERING DAFTAR BARANG TERSEDIA UNTUK DIPINJAM ---
    const updateBorrowFilterOptions = () => {
        const uniqueJenis = [...new Set(inventory.map(item => item.jenis))];
        borrowFilterJenisSelect.innerHTML = '<option value="">Semua Jenis</option>';
        uniqueJenis.sort().forEach(jenis => {
            const option = document.createElement('option');
            option.value = jenis;
            option.textContent = jenis;
            borrowFilterJenisSelect.appendChild(option);
        });
    };

    const renderAvailableItems = () => {
        availableItemsTableBody.innerHTML = '';
        const searchTerm = borrowSearchBar.value.toLowerCase();
        const filterJenis = borrowFilterJenisSelect.value.toLowerCase();

        const available = inventory.filter(item => {
            const matchesSearch = 
                item.name.toLowerCase().includes(searchTerm) ||
                item.jenis.toLowerCase().includes(searchTerm) ||
                item.tipe.toLowerCase().includes(searchTerm);
            const matchesFilter = filterJenis === '' || item.jenis.toLowerCase() === filterJenis;
            
            return item.status === 'available' && item.quantity > 0 && matchesSearch && matchesFilter;
        });

        if (available.length === 0) {
            noAvailableItemsMessage.style.display = 'block';
        } else {
            noAvailableItemsMessage.style.display = 'none';
        }

        available.forEach(item => {
            const row = availableItemsTableBody.insertRow();
            row.insertCell().textContent = item.jenis;
            row.insertCell().textContent = item.name;
            row.insertCell().textContent = item.tipe;
            row.insertCell().textContent = item.quantity;
            row.insertCell().textContent = item.kondisi;

            const actionCell = row.insertCell();
            const borrowBtn = document.createElement('button');
            borrowBtn.textContent = 'Pinjam';
            borrowBtn.classList.add('modern-button', 'small-button', 'update-btn');
            borrowBtn.onclick = () => {
                selectedItemForBorrow = item;
                confirmItemNameSpan.textContent = `${item.name} (${item.tipe})`;
                initialConditionInput.value = item.kondisi;
                confirmBorrowModal.style.display = 'flex';
                confirmBorrowModal.classList.add('active');
            };
            actionCell.appendChild(borrowBtn);
        });
    };

    borrowSearchBar.addEventListener('keyup', renderAvailableItems);
    borrowFilterJenisSelect.addEventListener('change', renderAvailableItems);

    // --- LOGIKA PEMINJAMAN ALAT ---
    confirmBorrowBtn.addEventListener('click', () => {
        const condition = initialConditionInput.value.trim();

        if (selectedItemForBorrow && selectedAssignmentId) {
            const item = selectedItemForBorrow;
            const assignment = assignments.find(a => a.id === selectedAssignmentId);

            if (assignment && item.quantity > 0) {
                item.kondisi = condition;
                item.status = 'borrowed';
                item.quantity--;
                
                const borrowRecord = {
                    borrower: currentUsername,
                    assignmentId: assignment.id,
                    assignmentTitle: `${assignment.mataAcara} - ${assignment.judulAcara}`,
                    startDate: getTodayDate(),
                    endDate: null,
                    purpose: assignment.judulAcara,
                    conditionOnBorrow: condition,
                    conditionOnReturn: null
                };
                if (!item.borrowHistory) {
                    item.borrowHistory = [];
                }
                item.borrowHistory.push(borrowRecord);

                if (!assignment.borrowedItems) {
                    assignment.borrowedItems = [];
                }
                assignment.borrowedItems.push({
                    itemId: item.id,
                    itemName: item.name,
                    itemTipe: item.tipe,
                    borrowRecordIndex: item.borrowHistory.length - 1
                });

                saveInventory();
                saveAssignments();

                showToast(`Alat ${item.name} berhasil dipinjam untuk surat tugas ${assignment.judulAcara}!`, 'success');
                confirmBorrowModal.style.display = 'none';
                confirmBorrowModal.classList.remove('active');
                
                renderAvailableItems();
                renderBorrowedItems();
            } else if (item.quantity === 0) {
                 showToast(`Alat ${item.name} sudah habis.`, 'error');
            }
        }
    });


    // --- RENDERING DAFTAR BARANG SEDANG DIPINJAM ---
    const renderBorrowedItems = () => {
        borrowedItemsTableBody.innerHTML = '';
        const borrowed = inventory.filter(item => 
            item.status === 'borrowed' &&
            item.borrowHistory &&
            item.borrowHistory.some(history => history.borrower === currentUsername && history.endDate === null)
        );

        if (borrowed.length === 0) {
            noBorrowedItemsMessage.style.display = 'block';
        } else {
            noBorrowedItemsMessage.style.display = 'none';
        }

        borrowed.forEach(item => {
            const activeHistory = item.borrowHistory.find(history => 
                history.borrower === currentUsername && history.endDate === null
            );

            if (activeHistory) {
                const row = borrowedItemsTableBody.insertRow();
                row.insertCell().textContent = item.jenis;
                row.insertCell().textContent = item.name;
                row.insertCell().textContent = item.tipe;
                row.insertCell().textContent = activeHistory.startDate;
                row.insertCell().textContent = activeHistory.conditionOnBorrow;

                const actionCell = row.insertCell();
                const returnBtn = document.createElement('button');
                returnBtn.textContent = 'Kembalikan';
                returnBtn.classList.add('modern-button', 'small-button', 'danger-btn');
                returnBtn.onclick = () => {
                    selectedItemForReturn = item;
                    returnItemNameSpan.textContent = `${item.name} (${item.tipe})`;
                    borrowedConditionSpan.textContent = activeHistory.conditionOnBorrow;
                    returnConditionInput.value = activeHistory.conditionOnReturn || activeHistory.conditionOnBorrow;
                    confirmReturnModal.style.display = 'flex';
                    confirmReturnModal.classList.add('active');
                };
                actionCell.appendChild(returnBtn);
            }
        });
    };

    // --- LOGIKA PENGEMBALIAN ALAT ---
    confirmReturnBtn.addEventListener('click', () => {
        const conditionOnReturn = returnConditionInput.value.trim();

        if (selectedItemForReturn) {
            const item = selectedItemForReturn;
            const activeHistoryIndex = item.borrowHistory.findIndex(history => 
                history.borrower === currentUsername && history.endDate === null
            );

            if (activeHistoryIndex > -1) {
                item.kondisi = conditionOnReturn;
                
                item.borrowHistory[activeHistoryIndex].endDate = getTodayDate();
                item.borrowHistory[activeHistoryIndex].conditionOnReturn = conditionOnReturn;
                
                item.status = 'available';
                item.quantity++;

                saveInventory();
                showToast(`Alat ${item.name} berhasil dikembalikan!`, 'success');
                confirmReturnModal.style.display = 'none';
                confirmReturnModal.classList.remove('active');

                renderAvailableItems();
                renderBorrowedItems();
            }
        }
    });

    renderMyAssignments();

    inventory.forEach(item => {
        if (!item.id) {
            item.id = 'ITEM-' + Date.now() + Math.random().toString(36).substring(2, 9);
        }
        if (!item.status) {
            item.status = 'available';
        }
        if (!item.borrowHistory) {
            item.borrowHistory = [];
        }
    });
    saveInventory();

    // Pastikan scanner berhenti saat halaman ditutup atau ditinggalkan
    window.addEventListener('beforeunload', () => {
        stopBorrowScanner(); // Pastikan scanner di modal borrow berhenti
    });
});