import { TwoDDocParser } from './parser.js';

let codeReader;
const video = document.getElementById('video');
const output = document.getElementById('output');
const targetingBox = document.getElementById('targeting-box');

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
        
        // Configure ZXing reader with hints to preserve special characters
        const hints = new Map();
        hints.set(ZXing.DecodeHintType.CHARACTER_SET, "UTF-8");
        hints.set(ZXing.DecodeHintType.ASSUME_GS1, false);
        hints.set(ZXing.DecodeHintType.FORCE_C40, false);

        codeReader = new ZXing.BrowserDatamatrixCodeReader(hints);
        const parser = new TwoDDocParser();
        
        await codeReader.decodeFromVideoDevice(
            undefined, 
            'video',
            (result, err) => {
                if (result) {
                    const rawData = result.getText();
                    console.log("Found code:", rawData);
                    targetingBox.classList.add('detected');
                    
                    try {
                        // Parse the 2D-DOC data
                        const parsedData = parser.parse(rawData);
                        
                        // Log detailed parsing information
                        console.log("Message zone data:", parsedData.messageData);
                        console.log("Parsed fields:", Object.entries(parsedData.fields).map(([id, field]) => 
                            `${id} (${field.name}): "${field.value}"`
                        ));
                        
                        // Display the results
                        output.innerHTML = `
                            <h2>2D-DOC Parse Results</h2>
                            
                            <h3>Document Type</h3>
                            <ul>
                                <li>${parsedData.docType.name || 'Unknown'}</li>
                            </ul>
                            
                            <h3>Header Information</h3>
                            <ul>
                                <li>Version: ${parsedData.version}</li>
                                <li>Country: ${parsedData.country}</li>
                                <li>Issuer: ${parsedData.perimeter}</li>
                            </ul>

                            <h3>Document Information</h3>
                            <ul>
                                ${Object.values(parsedData.fields)
                                    .map(field => `<li><strong>${field.name}:</strong> ${field.value}</li>`)
                                    .join('')}
                            </ul>

                            <h3>Signature</h3>
                            <div class="signature">${parsedData.signature || 'Not available'}</div>
                        `;
                    } catch (error) {
                        console.error('Error parsing 2D-DOC:', error);
                        output.innerHTML = `
                            <div class="error">Error parsing 2D-DOC: ${error.message}</div>
                        `;
                    }
                    
                    setTimeout(() => {
                        targetingBox.classList.remove('detected');
                    }, 1000);
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
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