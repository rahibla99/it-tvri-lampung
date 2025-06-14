document.addEventListener('DOMContentLoaded', () => {
    // --- Debugging: Cek apakah auth.js sudah di-load ---
    if (typeof getLoggedInUser === 'undefined') {
        console.error("Error: auth.js not loaded or getLoggedInUser is not defined.");
        // Mungkin tampilkan pesan error di UI jika perlu
        return; // Hentikan eksekusi script jika auth.js belum ada
    }
    const currentUser = getLoggedInUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    const currentUserRole = currentUser.role; // Ambil role user

    const scannedItemInfoDiv = document.getElementById('scanned-item-info');
    const qrCodeFileInput = document.getElementById('qr-file-input');
    const startScanBtn = document.getElementById('startScanBtn');
    const scannerContainer = document.getElementById('scannerContainer');
    const readerDiv = document.getElementById('reader');

    // --- Debugging: Pastikan semua elemen ditemukan ---
    if (!scannedItemInfoDiv) console.error("scannedItemInfoDiv not found!");
    if (!qrCodeFileInput) console.error("qrCodeFileInput not found!");
    if (!startScanBtn) console.error("startScanBtn not found!");
    if (!scannerContainer) console.error("scannerContainer not found!");
    if (!readerDiv) console.error("readerDiv not found!");

    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];

    // Inisialisasi Html5QrcodeScanner
    // PENTING: Inisialisasi hanya jika readerDiv ditemukan
    let html5QrCode;
    if (readerDiv) {
        html5QrCode = new Html5Qrcode("reader");
        console.log("Html5Qrcode initialized.");
    } else {
        console.error("Html5Qrcode cannot be initialized: 'reader' div not found.");
    }

    const qrCodeConfig = {
        fps: 10, // Frames per second
        qrbox: { width: 250, height: 250 }, // Ukuran area scan
        rememberLastUsedCamera: true,
        aspectRatio: 1.777,
        disableFlip: false // Penting: Izinkan flip untuk QR code yang mungkin terbalik
    };

    const displayScannedItem = (decodedText) => {
        // Kita asumsikan format QR adalah "Nama: [Nama Barang]\nJenis: [Jenis]\nTipe: [Tipe]\nJumlah: [Jumlah]\nKelengkapan: [Kelengkapan]\nKondisi: [Kondisi]\nDeskripsi: [Deskripsi]\nID: [ID]"
        const lines = decodedText.split('\n');
        let scannedName = '';
        let scannedJenis = '';
        let scannedTipe = '';
        let scannedId = '';

        lines.forEach(line => {
            if (line.startsWith('Nama: ')) {
                scannedName = line.replace('Nama: ', '').trim();
            } else if (line.startsWith('Jenis: ')) {
                scannedJenis = line.replace('Jenis: ', '').trim();
            } else if (line.startsWith('Tipe: ')) {
                scannedTipe = line.replace('Tipe: ', '').trim();
            } else if (line.startsWith('ID: ')) {
                scannedId = line.replace('ID: ', '').trim();
            }
        });
        
        // Fallback jika format tidak sesuai ekspektasi (misal cuma nama saja tanpa detail lain)
        if (!scannedName && lines.length > 0) {
            scannedName = lines[0].trim();
        }

        // Mencari item berdasarkan ID, atau jika tidak ada ID, pakai Nama, Jenis, dan Tipe
        let foundItem = null;
        if (scannedId) {
            foundItem = inventory.find(item => item.id === scannedId);
        } else {
            foundItem = inventory.find(item => 
                item.name.toLowerCase() === scannedName.toLowerCase() &&
                item.jenis.toLowerCase() === scannedJenis.toLowerCase() &&
                item.tipe.toLowerCase() === scannedTipe.toLowerCase()
            );
        }

        scannedItemInfoDiv.innerHTML = ''; // Kosongkan hasil sebelumnya

        if (foundItem) {
            const itemHtml = `
                <div class="scan-result-item">
                    <p><strong>Jenis Barang:</strong> ${foundItem.jenis}</p>
                    <p><strong>Nama Barang:</strong> ${foundItem.name}</p>
                    <p><strong>Tipe:</strong> ${foundItem.tipe}</p>
                    <p><strong>Jumlah:</strong> ${foundItem.quantity}</p>
                    <p><strong>Kelengkapan:</strong> ${foundItem.kelengkapan || '-'}</p>
                    <p><strong>Kondisi:</strong> ${foundItem.kondisi || '-'}</p>
                    <p><strong>Status:</strong> ${foundItem.status === 'available' ? 'Tersedia' : 'Dipinjam'}</p>
                    <p><strong>Deskripsi:</strong> ${foundItem.description || '-'}</p>
                    <p><strong>ID:</strong> ${foundItem.id || '-'}</p>
                </div>
            `;
            scannedItemInfoDiv.innerHTML = itemHtml;
            showToast(`Barang ${foundItem.name} ditemukan!`, 'success');
        } else {
            scannedItemInfoDiv.innerHTML = `
                <p>Barang dengan barcode/QR code: <strong>"${scannedName || decodedText.substring(0, 50) + (decodedText.length > 50 ? '...' : '')}"</strong> tidak ditemukan di inventaris.</p>
                <p>Data yang dipindai: <br><code>${decodedText}</code></p>
            `;
            showToast('Barang tidak ditemukan!', 'error');
        }
    };

    const onScanSuccess = (decodedText, decodedResult) => {
        console.log(`Scan result: ${decodedText}`, decodedResult);
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                console.log("QR Code scanning stopped.");
                displayScannedItem(decodedText);
            }).catch((err) => {
                console.error("Failed to stop QR Code scanning:", err);
                displayScannedItem(decodedText);
            });
        } else {
            displayScannedItem(decodedText);
        }
    };

    const onScanError = (errorMessage) => {
        // console.warn(`QR Code scan error: ${errorMessage}`); // Jangan spam konsol terlalu banyak
    };

    const startCameraScanner = () => {
        if (html5QrCode && !html5QrCode.isScanning) {
            html5QrCode.start(
                { facingMode: "environment" },
                qrCodeConfig,
                onScanSuccess,
                onScanError
            ).catch(err => {
                console.error("Gagal memulai scanner kamera:", err);
                scannedItemInfoDiv.innerHTML = '<p style="color: red;">Gagal mengakses kamera. Pastikan Anda mengizinkan akses kamera dan tidak ada aplikasi lain yang menggunakannya.</p>';
                scannerContainer.style.display = 'none'; 
                startScanBtn.style.display = 'block'; 
                showToast('Gagal mengakses kamera. Izinkan akses atau gunakan upload gambar.', 'error'); // Pakai toast
            });
        } else if (!html5QrCode) {
             console.error("Scanner not initialized. Cannot start camera.");
             showToast('Scanner tidak terinisialisasi. Coba refresh halaman.', 'error'); // Pakai toast
        }
    };

    if (startScanBtn && scannerContainer) {
        startScanBtn.addEventListener('click', () => {
            console.log("Mulai Scan button clicked.");
            scannerContainer.style.display = 'block'; 
            startScanBtn.style.display = 'none'; 
            startCameraScanner(); 
        });
    } else {
        console.error("Start Scan button or Scanner Container not found.");
    }

    if (qrCodeFileInput) {
        qrCodeFileInput.addEventListener('change', (e) => {
            if (e.target.files.length === 0) {
                return;
            }
            const imageFile = e.target.files[0];
            
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    console.log("Camera stopped for image scan.");
                    html5QrCode.scanFile(imageFile, true)
                        .then(decodedText => {
                            onScanSuccess(decodedText, {});
                        })
                        .catch(err => {
                            console.error(`Error scanning file: ${err}`);
                            scannedItemInfoDiv.innerHTML = `<p style="color: red;">Gagal memindai gambar barcode: ${err}</p>`;
                            showToast(`Gagal memindai gambar: ${err.message || err}`, 'error'); // Pakai toast
                        })
                        .finally(() => {
                            startCameraScanner(); 
                        });
                }).catch(err => {
                    console.error("Failed to stop camera before image scan:", err);
                    html5QrCode.scanFile(imageFile, true)
                        .then(decodedText => { onScanSuccess(decodedText, {}); })
                        .catch(err => {
                            console.error(`Error scanning file (fallback): ${err}`);
                            scannedItemInfoDiv.innerHTML = `<p style="color: red;">Gagal memindai gambar barcode: ${err}</p>`;
                            showToast(`Gagal memindai gambar (fallback): ${err.message || err}`, 'error'); // Pakai toast
                        })
                        .finally(() => { startCameraScanner(); });
                });
            } else if (html5QrCode) {
                html5QrCode.scanFile(imageFile, true)
                    .then(decodedText => {
                        onScanSuccess(decodedText, {});
                    })
                    .catch(err => {
                        console.error(`Error scanning file: ${err}`);
                        scannedItemInfoDiv.innerHTML = `<p style="color: red;">Gagal memindai gambar barcode: ${err}</p>`;
                        showToast(`Gagal memindai gambar: ${err.message || err}`, 'error'); // Pakai toast
                    });
            } else {
                console.error("Scanner not initialized. Cannot scan file.");
                showToast('Scanner tidak terinisialisasi. Tidak bisa scan gambar.', 'error'); // Pakai toast
            }
            e.target.value = ''; 
        });
    } else {
        console.error("QR Code File Input not found.");
    }

    window.addEventListener('beforeunload', () => {
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(err => console.warn("Failed to stop scanner on page unload:", err));
        }
    });
});