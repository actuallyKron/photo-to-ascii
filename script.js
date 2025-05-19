const imageUpload = document.getElementById('imageUpload');
const originalImage = document.getElementById('originalImage');
const imageCanvas = document.getElementById('imageCanvas'); // Used for initial processing
const asciiPreview = document.getElementById('asciiPreview');
const downloadControls = document.getElementById('downloadControls'); // Get the controls div
const downloadPngButton = document.getElementById('downloadPngButton');
const downloadJpgButton = document.getElementById('downloadJpgButton'); // Get JPG button
const downloadTxtButton = document.getElementById('downloadTxtButton');
const cameraButton = document.getElementById('cameraButton');
const cameraPreview = document.getElementById('cameraPreview');
const cameraCanvas = document.getElementById('cameraCanvas');

// Option Sliders
const outputWidthSlider = document.getElementById('outputWidthSlider');
const outputWidthValue = document.getElementById('outputWidthValue');
const charSetSelect = document.getElementById('charSetSelect'); // Character set select
const colorPaletteButtonsContainer = document.getElementById('colorPaletteButtonsContainer'); // New container for palette buttons

// Preview elements for dynamic styling
const previewContainer = document.querySelector('.preview-container');
const previewHeader = document.querySelector('.preview-container h2');

const ctx = imageCanvas.getContext('2d');

const CHARACTER_SETS = {
    "Standard":         '@%#*+=-:. ',
    "Simple":           '.:-=+*#%@',
    "Shades":           ' ░▒▓█',
    "Short":            '@#=-. ',
    "ReversedStd":    ' .:=-+*#%@',
    "Lines":            '-|/\\+.',
    "Blocky":           ' _.,-=+:;cba!?0123456789$W#@Ñ',
    "Binary":           '01 ',
    "Detailed":       '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,""^^`\'. ',
    "Numeric":          ' 0123456789'
};
// let asciiChars = CHARACTER_SETS["Standard"].split(''); // Default, will be updated by select

const COLOR_PALETTES = {
    "Terminal Green": { textColor: '#00FF00', bgColor: '#000000' },
    "Classic White":  { textColor: '#000000', bgColor: '#FFFFFF' },
    "Amber":          { textColor: '#FFBF00', bgColor: '#201500' },
    "Cool Blue":      { textColor: '#00FFFF', bgColor: '#000020' },
    "Matrix Pink":    { textColor: '#FF00FF', bgColor: '#110011' },
    "Solarized Dark": { textColor: '#839496', bgColor: '#002b36' },
    "Blossom":        { textColor: '#FFC0CB', bgColor: '#4B0082' }, // Pink text on Indigo/Dark Magenta background
    "Red Alert":      { textColor: '#FF0000', bgColor: '#180000' },
    "Electric Yellow":{ textColor: '#FFFF00', bgColor: '#151500' },
    "Ocean Deep":     { textColor: '#7FFFD4', bgColor: '#00008B' },
    "Forest Vibes":   { textColor: '#90EE90', bgColor: '#003300' },
    "Lavender Dream": { textColor: '#E6E6FA', bgColor: '#201530' },
    "Orange Sunset":  { textColor: '#FFA500', bgColor: '#301500' }
};

const FIXED_HEIGHT_ADJUSTMENT = 0.5; // Fixed value for height adjustment
const ASCII_FONT_SIZE_PX = 10; // Font size for rendering ASCII to image
const ASCII_LINE_HEIGHT_MULTIPLIER = 1.1; // Line height for rendering ASCII to image
const ASCII_IMAGE_PADDING_PX = 4; // Reduced padding for the output image
const ASCII_FONT = `"Courier New", Courier, monospace`;

let currentSelectedPaletteName = "Terminal Green"; // Default selected palette
let stream = null;

// Function to apply selected palette to the live preview
function applyPreviewPalette(palette) {
    if (!palette) return;
    asciiPreview.style.color = palette.textColor;
    asciiPreview.style.backgroundColor = palette.bgColor;
    // asciiPreview.style.borderColor = palette.textColor; // Removed - border will stay green from CSS

    // if (previewHeader) { // Removed
    //     previewHeader.style.color = palette.textColor;
    // }
    // if (previewContainer) { // Removed
    //     // Keep container background dark for contrast, but match its main border to text
    //     previewContainer.style.borderColor = palette.textColor;
    // }
}

function updateSelectedButtonHighlight(selectedName) {
    const buttons = colorPaletteButtonsContainer.querySelectorAll('button');
    buttons.forEach(button => {
        if (button.dataset.paletteName === selectedName) {
            button.classList.add('selected-palette-button');
        } else {
            button.classList.remove('selected-palette-button');
        }
    });
}

// Populate Character Set Select
function populateCharSetSelect() {
    for (const setName in CHARACTER_SETS) {
        const option = document.createElement('option');
        option.value = setName;
        option.textContent = setName;
        charSetSelect.appendChild(option);
    }
    charSetSelect.value = "Standard"; // Set default
}

// Populate Color Palette Select (Now Buttons)
function populateColorPaletteButtons() {
    colorPaletteButtonsContainer.innerHTML = ''; // Clear existing buttons if any
    for (const paletteName in COLOR_PALETTES) {
        const button = document.createElement('button');
        const palette = COLOR_PALETTES[paletteName];
        button.classList.add('palette-button');
        button.dataset.paletteName = paletteName;
        button.title = paletteName; // Tooltip for palette name

        // Style the button to represent the palette
        button.style.backgroundColor = palette.bgColor;
        button.style.color = palette.textColor;
        // Add a small visual cue using text, like "Aa"
        button.textContent = 'Aa'; 
        // Or, use a border to show the text color if background is too dark/light for 'Aa'
        button.style.border = `2px solid ${palette.textColor}`;


        button.addEventListener('click', () => {
            currentSelectedPaletteName = paletteName;
            applyPreviewPalette(palette);
            updateSelectedButtonHighlight(paletteName);
            // No need to re-process image, just updating preview style
        });
        colorPaletteButtonsContainer.appendChild(button);
    }
    updateSelectedButtonHighlight(currentSelectedPaletteName); // Highlight default/initial
}

// Function to initialize and update slider display values
function updateSliderDisplays() {
    outputWidthValue.textContent = outputWidthSlider.value;
    if (originalImage.src && originalImage.src !== window.location.href + "#") { // Check if an image is loaded
        processImage();
    }
}

// Event listeners for sliders
outputWidthSlider.addEventListener('input', () => {
    updateSliderDisplays();
});

charSetSelect.addEventListener('change', () => {
    if (originalImage.src && originalImage.src !== window.location.href + "#") {
        processImage();
    }
});

imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage.src = e.target.result;
            originalImage.onload = () => {
                processImage();
            }
        }
        reader.readAsDataURL(file);
    }
});

function processImage() {
    const currentMaxWidth = parseInt(outputWidthSlider.value);
    const currentHeightAdj = FIXED_HEIGHT_ADJUSTMENT;
    const selectedCharSetName = charSetSelect.value;
    const currentAsciiChars = CHARACTER_SETS[selectedCharSetName].split('');

    const aspectRatio = originalImage.height / originalImage.width;
    let newWidth = originalImage.width;
    let newHeight = originalImage.height;

    if (newWidth > currentMaxWidth) {
        newWidth = currentMaxWidth;
        newHeight = newWidth * aspectRatio;
    }
    
    newHeight = Math.floor(newHeight * currentHeightAdj); 
    newWidth = Math.floor(newWidth);

    // Ensure newWidth and newHeight are at least 1 to avoid errors
    newWidth = Math.max(1, newWidth);
    newHeight = Math.max(1, newHeight);

    imageCanvas.width = newWidth;
    imageCanvas.height = newHeight;

    ctx.drawImage(originalImage, 0, 0, newWidth, newHeight);

    const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
    const data = imageData.data;
    let asciiString = '';

    if (newWidth === 0) { // Prevent infinite loop if width is 0
        asciiPreview.textContent = "Error: Output width is zero.";
        downloadControls.style.display = 'none';
        return;
    }

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const gray = (r + g + b) / 3;
        // Ensure currentAsciiChars.length is not zero to prevent NaN or errors
        const charIndex = Math.floor((gray / 255) * Math.max(0, currentAsciiChars.length - 1));
        asciiString += currentAsciiChars[charIndex] || ' '; // Fallback to space if index is out of bounds
        
        if (((i / 4) + 1) % newWidth === 0) {
            asciiString += '\n';
        }
    }
    
    asciiPreview.textContent = asciiString;
    downloadControls.style.display = 'block'; // Show the download controls div
}

function renderAsciiToCanvas(asciiString, fontSize, lineHeightMultiplier, font, textColor, bgColor) {
    const lines = asciiString.trim().split('\n');
    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) return null;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    const actualFontSize = fontSize;
    tempCtx.font = `${actualFontSize}px ${font}`; // Set font *before* measuring text

    const fullLineHeight = actualFontSize * lineHeightMultiplier;

    // Calculate precise text block dimensions
    const allLineWidths = lines.map(line => tempCtx.measureText(line).width);
    const maxTextWidth = Math.max(0, ...allLineWidths);
    const textBlockHeight = lines.length * fullLineHeight;

    // Calculate canvas dimensions with minimal padding
    tempCanvas.width = maxTextWidth + (ASCII_IMAGE_PADDING_PX * 2);
    tempCanvas.height = textBlockHeight + (ASCII_IMAGE_PADDING_PX * 2) - (actualFontSize * (lineHeightMultiplier -1)); // Adjust for line height slightly
    // The - (actualFontSize * (lineHeightMultiplier -1)) is to compensate for the extra space below the last line due to line height > 1
    // Effectively, textBaseline top means y is the top of the em box. Height of text is lines * fullLineHeight. Padding bottom is fine.

    // Re-set font after canvas resize if context is reset (though typically not needed for just w/h change)
    tempCtx.font = `${actualFontSize}px ${font}`;

    // Background
    tempCtx.fillStyle = bgColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Text
    tempCtx.fillStyle = textColor;
    tempCtx.textAlign = 'left';
    tempCtx.textBaseline = 'top';

    lines.forEach((line, index) => {
        tempCtx.fillText(line, ASCII_IMAGE_PADDING_PX, ASCII_IMAGE_PADDING_PX + (index * fullLineHeight));
    });

    return tempCanvas;
}

downloadPngButton.addEventListener('click', () => {
    const asciiText = asciiPreview.textContent;
    if (!asciiText || asciiText.trim() === '') {
        alert("Nothing to download yet! Please upload an image first.");
        return;
    }

    const selectedPalette = COLOR_PALETTES[currentSelectedPaletteName];

    const renderedCanvas = renderAsciiToCanvas(asciiText, ASCII_FONT_SIZE_PX, ASCII_LINE_HEIGHT_MULTIPLIER, ASCII_FONT, selectedPalette.textColor, selectedPalette.bgColor);

    if (renderedCanvas) {
        const dataUrl = renderedCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'ascii-art.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        alert("Could not render ASCII art to image.");
    }
});

downloadJpgButton.addEventListener('click', () => {
    const asciiText = asciiPreview.textContent;
    if (!asciiText || asciiText.trim() === '') {
        alert("Nothing to download yet! Please upload an image first.");
        return;
    }

    const selectedPalette = COLOR_PALETTES[currentSelectedPaletteName];

    const renderedCanvas = renderAsciiToCanvas(asciiText, ASCII_FONT_SIZE_PX, ASCII_LINE_HEIGHT_MULTIPLIER, ASCII_FONT, selectedPalette.textColor, selectedPalette.bgColor);

    if (renderedCanvas) {
        const dataUrl = renderedCanvas.toDataURL('image/jpeg', 0.9);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'ascii-art.jpg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        alert("Could not render ASCII art to image.");
    }
});

downloadTxtButton.addEventListener('click', () => {
    const textToSave = asciiPreview.textContent;
    if (!textToSave || textToSave.trim() === '') {
        alert("Nothing to download yet! Please upload an image first.");
        return;
    }

    const blob = new Blob([textToSave], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii-art.txt'; // Filename for the download
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up
});

// Camera functionality
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        cameraPreview.srcObject = stream;
        cameraPreview.style.display = 'block';
        cameraButton.textContent = 'Take Photo';
    } catch (err) {
        console.error('Error accessing camera:', err);
        alert('Could not access camera. Please make sure you have granted camera permissions.');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        cameraPreview.srcObject = null;
        cameraPreview.style.display = 'none';
        stream = null;
    }
}

function capturePhoto() {
    if (!stream) {
        startCamera();
        return;
    }

    // Set canvas dimensions to match video
    cameraCanvas.width = cameraPreview.videoWidth;
    cameraCanvas.height = cameraPreview.videoHeight;
    
    // Draw the current video frame to the canvas
    const ctx = cameraCanvas.getContext('2d');
    ctx.drawImage(cameraPreview, 0, 0);
    
    // Convert canvas to data URL and set as image source
    originalImage.src = cameraCanvas.toDataURL('image/jpeg');
    originalImage.onload = () => {
        processImage();
        stopCamera();
        cameraButton.textContent = 'Take Photo';
    };
}

cameraButton.addEventListener('click', capturePhoto);

// Initialize slider displays on page load
document.addEventListener('DOMContentLoaded', () => {
    populateCharSetSelect();
    populateColorPaletteButtons();
    updateSliderDisplays();

    // Apply initial palette to preview
    const initialPalette = COLOR_PALETTES[currentSelectedPaletteName];
    applyPreviewPalette(initialPalette);
    updateSelectedButtonHighlight(currentSelectedPaletteName); // Ensure initial button is highlighted
}); 