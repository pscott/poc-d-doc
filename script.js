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
        
        codeReader = new ZXing.BrowserDatamatrixCodeReader();
        const parser = new TwoDDocParser();
        
        await codeReader.decodeFromVideoDevice(
            undefined, 
            'video',
            (result, err) => {
                if (result) {
                    console.log("Found code:", result.getText());
                    targetingBox.classList.add('detected');
                    
                    try {
                        // Parse the 2D-DOC data
                        const parsedData = parser.parse(result.getText());
                        
                        // Display the results
                        output.innerHTML = `
                            <h2>2D-DOC Parse Results</h2>
                            
                            <h3>Header Information</h3>
                            <ul>
                                <li>Format: ${parsedData.header.format}</li>
                                <li>Country: ${parsedData.header.country}</li>
                                <li>Issuer: ${parsedData.header.issuer}</li>
                            </ul>

                            <h3>Fields</h3>
                            <ul>
                                ${Object.entries(parsedData.fields)
                                    .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
                                    .join('')}
                            </ul>

                            <h3>Signature</h3>
                            <div class="signature">${parsedData.signature}</div>
                        `;
                    } catch (error) {
                        console.error('Error parsing 2D-DOC:', error);
                        output.innerHTML = `
                            <div class="error">Error parsing 2D-DOC: ${error.message}</div>
                        `;
                    }
                    
                    // Reset the border color after 1 second
                    setTimeout(() => {
                        targetingBox.classList.remove('detected');
                    }, 1000);
                }
                // Only log critical errors
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