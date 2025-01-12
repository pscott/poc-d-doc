import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';

let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let output = document.getElementById('output');
let targetingBox = document.getElementById('targeting-box');

const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.QR_CODE
]);
hints.set(DecodeHintType.TRY_HARDER, true);

const codeReader = new BrowserMultiFormatReader(hints);

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        
        await codeReader.decodeFromVideoDevice(
            undefined, 
            'video',
            (result, err) => {
                if (result) {
                    console.log("Found code:", result.getText());
                    console.log("Format:", result.getBarcodeFormat());
                    targetingBox.classList.add('detected');
                    output.innerHTML = `
                        <p>Code détecté!</p>
                        <p>Format: ${result.getBarcodeFormat()}</p>
                        <pre>${result.getText()}</pre>
                    `;
                    
                    // Reset the border color after 1 second
                    setTimeout(() => {
                        targetingBox.classList.remove('detected');
                    }, 1000);
                }
                if (err && !(err instanceof NotFoundException)) {
                    console.error("Error:", err);
                    targetingBox.classList.remove('detected');
                }
            }
        );

        console.log('Camera started successfully');
    } catch (err) {
        console.error('Error accessing camera:', err);
        output.innerHTML = '<p style="color: red;">Erreur d\'accès à la caméra. Veuillez autoriser l\'accès.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    startCamera().catch(err => {
        console.error('Failed to start camera:', err);
        output.innerHTML = '<p style="color: red;">Failed to start camera</p>';
    });
}); 