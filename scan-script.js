document.addEventListener('DOMContentLoaded', () => {
    const scannedItemInfoDiv = document.getElementById('scanned-item-info');
    const qrCodeFileInput = document.getElementById('qr-file-input');

    let inventory = JSON.parse(localStorage.getItem('inventory')) || [];

    // Inisialisasi Html5QrcodeScanner
    // Pastikan ID "reader" ada di scan.html
    const html5QrCode = new Html5Qrcode("reader");

    // Konfigurasi scanner
    const qrCodeConfig = {
        fps: 10, // Frames per second
        qrbox: { width: 250, height: 250 }, // Ukuran area scan
        rememberLastUsedCamera: true,
        aspectRatio: 1.777,
        disableFlip: false // Penting: Izinkan flip untuk QR code yang mungkin terbalik
    };

    // Fungsi untuk menampilkan info barang yang discan
    const displayScannedItem = (decodedText) => {
        // Kita asumsikan format QR adalah "Nama: [Nama Barang]\nJumlah: [Jumlah]\nDeskripsi: [Deskripsi]"
        // Ini harus konsisten dengan format data yang digenerate di script.js
        const lines = decodedText.split('\n');
        let scannedName = '';
        if (lines[0] && lines[0].startsWith('Nama: ')) {
            scannedName = lines[0].replace('Nama: ', '').trim();
        } else {
            // Fallback jika format tidak sesuai ekspektasi (misal cuma nama saja)
            scannedName = decodedText.trim();
        }

        // Penting: Pastikan pencarian case-insensitive dan trim spasi
        const foundItem = inventory.find(item => item.name.toLowerCase() === scannedName.toLowerCase());

        scannedItemInfoDiv.innerHTML = ''; // Kosongkan hasil sebelumnya

        if (foundItem) {
            const itemHtml = `
                <div class="scan-result-item">
                    <p><strong>Nama Barang:</strong> ${foundItem.name}</p>
                    <p><strong>Jumlah:</strong> ${foundItem.quantity}</p>
                    <p><strong>Deskripsi:</strong> ${foundItem.description || '-'}</p>
                </div>
            `;
            scannedItemInfoDiv.innerHTML = itemHtml;
        } else {
            scannedItemInfoDiv.innerHTML = `
                <p>Barang dengan barcode/QR code: <strong>"${scannedName || decodedText}"</strong> tidak ditemukan di inventaris.</p>
                <p>Data yang dipindai: <br><code>${decodedText}</code></p>
            `;
        }
    };

    // Fungsi callback saat barcode berhasil discan (baik dari kamera maupun gambar)
    const onScanSuccess = (decodedText, decodedResult) => {
        console.log(`Scan result: ${decodedText}`, decodedResult);
        // Hentikan scanner jika sedang berjalan (misal setelah live scan)
        if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                console.log("QR Code scanning stopped.");
                displayScannedItem(decodedText);
            }).catch((err) => {
                console.error("Failed to stop QR Code scanning:", err);
                displayScannedItem(decodedText); // Tetap tampilkan hasil meski stop gagal
            });
        } else {
            // Jika scan dari file, scanner mungkin sudah berhenti atau belum mulai
            displayScannedItem(decodedText);
        }
    };

    // Fungsi callback saat ada error scan dari kamera
    const onScanError = (errorMessage) => {
        // console.warn(`QR Code scan error: ${errorMessage}`);
        // Error dari live scan tidak perlu selalu ditampilkan ke UI agar tidak mengganggu
    };

    // Fungsi untuk memulai scanner kamera
    const startScanner = () => {
        // Hanya mulai jika belum scanning
        if (!html5QrCode.isScanning) {
            html5QrCode.start(
                { facingMode: "environment" }, // Gunakan kamera belakang untuk scan fisik
                qrCodeConfig,
                onScanSuccess,
                onScanError
            ).catch(err => {
                console.error("Gagal memulai scanner kamera:", err);
                scannedItemInfoDiv.innerHTML = '<p style="color: red;">Gagal mengakses kamera. Pastikan Anda mengizinkan akses kamera dan tidak ada aplikasi lain yang menggunakannya.</p>';
            });
        }
    };

    // Mulai scanner saat halaman dimuat
    startScanner();

    // Event listener untuk input file (scan dari gambar)
    qrCodeFileInput.addEventListener('change', (e) => {
        if (e.target.files.length === 0) {
            return;
        }
        const imageFile = e.target.files[0];
        
        // Hentikan scanner kamera sementara jika sedang berjalan sebelum scan file
        if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
                console.log("Camera stopped for image scan.");
                html5QrCode.scanFile(imageFile, true) // scanFile(file, showImage)
                    .then(decodedText => {
                        onScanSuccess(decodedText, {}); // Panggil success handler
                    })
                    .catch(err => {
                        console.error(`Error scanning file: ${err}`);
                        scannedItemInfoDiv.innerHTML = `<p style="color: red;">Gagal memindai gambar barcode: ${err}</p>`;
                    })
                    .finally(() => {
                        // Setelah scan file selesai, restart kamera
                        startScanner();
                    });
            }).catch(err => {
                console.error("Failed to stop camera before image scan:", err);
                // Jika gagal stop, coba tetap scan file
                html5QrCode.scanFile(imageFile, true)
                    .then(decodedText => { onScanSuccess(decodedText, {}); })
                    .catch(err => {
                        console.error(`Error scanning file (fallback): ${err}`);
                        scannedItemInfoDiv.innerHTML = `<p style="color: red;">Gagal memindai gambar barcode: ${err}</p>`;
                    })
                    .finally(() => { startScanner(); });
            });
        } else {
            // Jika kamera tidak berjalan, langsung scan file
            html5QrCode.scanFile(imageFile, true)
                .then(decodedText => {
                    onScanSuccess(decodedText, {});
                })
                .catch(err => {
                    console.error(`Error scanning file: ${err}`);
                    scannedItemInfoDiv.innerHTML = `<p style="color: red;">Gagal memindai gambar barcode: ${err}</p>`;
                });
        }
        // Reset input file agar bisa memilih file yang sama lagi jika perlu
        e.target.value = ''; 
    });

    // Pastikan scanner berhenti saat halaman ditutup atau ditinggalkan
    window.addEventListener('beforeunload', () => {
        if (html5QrCode.isScanning) {
            html5QrCode.stop().catch(err => console.warn("Failed to stop scanner on page unload:", err));
        }
    });
});